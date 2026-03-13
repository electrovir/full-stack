import {assertWrap} from '@augment-vir/assert';
import {
    HttpStatus,
    selectFrom,
    type ErrorHttpStatus,
    type SelectFrom,
    type SuccessHttpStatus,
} from '@augment-vir/common';
import {
    AuthenticationOutcome,
    EmailCodeType,
    EventLogName,
    SortOrder,
    preparePassword,
    type BackendService,
    type Team,
    type User,
} from '@evir/common';
import {AdminAlertSeverity, invalidUserId} from '@evir/common-backend';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {doesPasswordMatchHash} from 'auth-vir';
import {normalizeEmailAddress, parseEmailAddress} from 'parse-email-address';
import {type BackendContext} from '../../context/create-backend-context.js';

export type SignUpDataReturn =
    | {
          statusCode: ErrorHttpStatus;
          responseErrorMessage: string;
          userId?: undefined;
      }
    | {
          statusCode: SuccessHttpStatus;
          userId: User['id'];
          responseErrorMessage?: string | undefined;
      };

export async function createNewUser<const ShouldReturnData extends boolean>(
    this: void,
    shouldReturnData: ShouldReturnData,
    {
        requireEmailVerification,
        teamId,
        emailAddress,
        password,
        selfServeInfo,
    }: {
        requireEmailVerification: boolean;
        teamId: Team['id'] | undefined;
        emailAddress: string;
        password: string | undefined;
        selfServeInfo: BackendService['endpoints']['/sign-up']['RequestType']['info'] | undefined;
    },
    {
        context,
        request,
    }: SelectFrom<
        EndpointImplementationParams<BackendContext, BackendService['endpoints']['/sign-up']>,
        {
            context: true;
            request: true;
        }
    >,
): Promise<
    ShouldReturnData extends true
        ? SignUpDataReturn
        : EndpointImplementationOutput<BackendService['endpoints']['/sign-up']['ResponseType']>
> {
    const normalizedEmailAddress = normalizeEmailAddress(emailAddress);
    const parsedEmailAddress = parseEmailAddress(normalizedEmailAddress);

    if (!normalizedEmailAddress || !parsedEmailAddress) {
        console.error(
            `Email address failed: ${JSON.stringify({
                normalizedEmailAddress,
                parsedEmailAddress,
                emailAddress,
            })}`,
        );
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Invalid email address.',
        };
    }
    const allowedEmailDomains =
        context.backendEnvClient.backendConfig.allowedEmailDomains[
            context.backendEnvClient.deployEnv
        ];

    const isEmailAddressAllowed = allowedEmailDomains
        ? allowedEmailDomains.includes(parsedEmailAddress.domain)
        : true;

    if (!isEmailAddressAllowed) {
        console.error(`Blocked email in '${context.backendEnvClient.deployEnv}': ${emailAddress}`);
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Invalid email address.',
        };
    }

    const preparedPassword = password
        ? await preparePassword(password, context.backendEnvClient.universalConfig)
        : undefined;

    if (password && !preparedPassword?.password) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: preparedPassword?.failureReason || 'Missing password.',
        };
    }

    const hashedPassword = preparedPassword?.password?.hashed;

    const existingUser = await context.prismaClient.user.findFirst({
        where: {
            normalizedEmailAddress,
            deactivatedAt: null,
            teamPermissions: {
                some: {
                    isEnabled: true,
                    team: {
                        deactivatedAt: null,
                    },
                },
            },
        },
        select: {
            id: true,
            humanName: true,
            accountVerifiedAt: true,
            emailAddress: true,
            password: true,

            teamPermissions: {
                where: {
                    isEnabled: true,
                    team: {
                        deactivatedAt: null,
                    },
                },
                select: {
                    teamId: true,
                    team: {
                        select: {
                            id: true,
                            teamName: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: SortOrder.desc,
                },
                take: 1,
            },
        },
    });

    if (existingUser) {
        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: normalizedEmailAddress,
                outcome: AuthenticationOutcome.SignUpWithExistingEmail,
            },
            relations: {
                userId: existingUser.id,
                teamId: undefined,
            },
        });

        if (shouldReturnData) {
            return {
                statusCode: HttpStatus.Conflict,
                responseErrorMessage: 'Cannot create users with duplicate email addresses.',
            };
        } else {
            /**
             * In this case, don't return an error but because we don't want to leak which emails
             * have been signed up to self serve sign ups.
             */
        }

        if (
            !existingUser.accountVerifiedAt &&
            password &&
            existingUser.password &&
            (await doesPasswordMatchHash({
                password,
                hash: existingUser.password,
            }))
        ) {
            void context.emailClient.sendVerificationCode({
                request,
                relevantTeam: undefined,
                toEmailAddress: existingUser.emailAddress,
                codeForUser: existingUser,
                codeType: EmailCodeType.AccountVerification,
            });
        }

        return {
            statusCode: HttpStatus.Ok,
            /**
             * Create an invalid user response so that the user trying to sign up cannot tell if the
             * users already exists or not.
             */
            headers: await context.backendAuthClient.createLoginHeaders({
                isSignUpCookie: true,
                requestHeaders: request.headers,
                userId: invalidUserId,
            }),
        } satisfies EndpointImplementationOutput<
            BackendService['endpoints']['/sign-up']['ResponseType']
        > as ShouldReturnData extends true
            ? SignUpDataReturn
            : EndpointImplementationOutput<BackendService['endpoints']['/sign-up']['ResponseType']>;
    }

    const newUser = await context.prismaClient.user.create({
        data: {
            password: hashedPassword || null,
            isUserApprovedByAdmin: !selfServeInfo,
            emailAddress,
            isInternalAdmin: false,
            normalizedEmailAddress,
            humanName: selfServeInfo?.humanName || '',
            teamPermissions: {
                create: teamId
                    ? {
                          teamId,
                          isEnabled: true,
                      }
                    : {
                          isEnabled: true,
                          team: {
                              create: {
                                  isTeamApprovedByAdmin: !selfServeInfo,
                                  teamName: assertWrap.isDefined(selfServeInfo).teamName,
                              },
                          },
                      },
            },
        },
        select: {
            id: true,
            emailAddress: true,
            humanName: true,
            teamPermissions: {
                select: {
                    teamId: true,
                    team: {
                        select: {
                            id: true,
                            teamName: true,
                        },
                    },
                },
                take: 1,
            },
        },
    });

    const newTeamPermission = newUser.teamPermissions[0];

    if (!newTeamPermission) {
        throw new Error('Failed to create team permission for new user.');
    }

    await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
        data: {
            emailAddress: newUser.emailAddress,
            outcome: AuthenticationOutcome.SignUp,
        },
        relations: {
            userId: newUser.id,
            teamId: newTeamPermission.teamId,
        },
    });

    if (selfServeInfo) {
        void context.adminAlertClient.sendAlert(
            AdminAlertSeverity.Info,
            `New self serve user signed up in ${context.backendEnvClient.deployEnv}: ${JSON.stringify(
                {
                    user: selectFrom(newUser, {
                        id: true,
                        emailAddress: true,
                    }),
                    teamId: newTeamPermission.teamId,
                    selfServeInfo,
                },
                null,
                4,
            )}`,
        );
    }

    if (!password) {
        void context.emailClient.sendVerificationCode({
            request,
            relevantTeam: newTeamPermission.team,
            toEmailAddress: newUser.emailAddress,
            codeForUser: newUser,
            codeType: EmailCodeType.UserInvitation,
        });
    } else if (requireEmailVerification) {
        void context.emailClient.sendVerificationCode({
            request,
            relevantTeam: newTeamPermission.team,
            toEmailAddress: newUser.emailAddress,
            codeForUser: newUser,
            codeType: EmailCodeType.AccountVerification,
        });
    }

    if (shouldReturnData) {
        return {
            statusCode: HttpStatus.Ok,
            userId: newUser.id,
        } satisfies SignUpDataReturn as ShouldReturnData extends true
            ? SignUpDataReturn
            : EndpointImplementationOutput<BackendService['endpoints']['/sign-up']['ResponseType']>;
    } else {
        const headers = await context.backendAuthClient.createLoginHeaders({
            isSignUpCookie: true,
            requestHeaders: request.headers,
            userId: newUser.id,
        });

        return {
            statusCode: HttpStatus.Ok,
            headers,
        } satisfies EndpointImplementationOutput<
            BackendService['endpoints']['/sign-up']['ResponseType']
        > as ShouldReturnData extends true
            ? SignUpDataReturn
            : EndpointImplementationOutput<BackendService['endpoints']['/sign-up']['ResponseType']>;
    }
}
