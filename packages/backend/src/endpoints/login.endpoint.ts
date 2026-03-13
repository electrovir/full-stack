import {HttpStatus} from '@augment-vir/common';
import {
    AuthenticationOutcome,
    EmailCodeType,
    EventLogName,
    filterValidTeamPermissions,
    SortOrder,
    teamPermissionSelection,
    type BackendService,
    type User,
} from '@evir/common';
import {getSelectedTeamIdFromHeaders} from '@evir/common-backend/src/data/selected-team-id.js';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {doesPasswordMatchHash} from 'auth-vir';
import {getNowInIsoString} from 'date-vir';
import {normalizeEmailAddress} from 'parse-email-address';
import {type BackendContext} from '../context/create-backend-context.js';
import {createUserResponse} from './user.endpoint.js';

/**
 * Checks whether the given user has reached the consecutive failed login attempt threshold.
 *
 * @returns `true` if the account should be locked.
 */
async function shouldLockAccount(
    this: void,
    {
        context,
        userId,
    }: {
        context: Readonly<Pick<BackendContext, 'prismaClient' | 'backendEnvClient'>>;
        userId: User['id'];
    },
): Promise<boolean> {
    /**
     * Find the most recent auth event that is not a failed password attempt (the "reset point"). A
     * successful login or any other outcome breaks the consecutive failure chain.
     */
    const lastNonFailure = await context.prismaClient.eventLog.findFirst({
        where: {
            userId,
            eventName: EventLogName.AuthenticationEvent,
            NOT: {
                extraData: {
                    path: 'outcome',
                    equals: AuthenticationOutcome.FailedWrongPassword,
                },
            },
        },
        orderBy: {
            createdAt: SortOrder.desc,
        },
        select: {
            createdAt: true,
        },
    });

    /** Count consecutive failed password attempts since the last non-failure event. */
    const consecutiveFailures = await context.prismaClient.eventLog.count({
        where: {
            userId,
            eventName: EventLogName.AuthenticationEvent,
            extraData: {
                path: 'outcome',
                equals: AuthenticationOutcome.FailedWrongPassword,
            },
            ...(lastNonFailure
                ? {
                      createdAt: {
                          gt: lastNonFailure.createdAt,
                      },
                  }
                : {}),
        },
    });

    return consecutiveFailures >= context.backendEnvClient.backendConfig.failedLoginLockoutCount;
}

export async function loginEndpoint(
    this: void,
    {
        context,
        requestData,
        request,
        requestHeaders,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/login']>,
): Promise<EndpointImplementationOutput<BackendService['endpoints']['/login']['ResponseType']>> {
    const normalizedEmailAddress = normalizeEmailAddress(requestData.emailAddress);

    if (!normalizedEmailAddress) {
        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: requestData.emailAddress,
                outcome: AuthenticationOutcome.FailedInvalidEmail,
            },
            relations: {},
        });

        return {
            statusCode: HttpStatus.Unauthorized,
        };
    }

    const userByEmail = await context.prismaClient.user.findFirst({
        where: {
            normalizedEmailAddress,
            deactivatedAt: null,
        },
        select: {
            id: true,
            isUserApprovedByAdmin: true,
            emailAddress: true,
            humanName: true,
            isInternalAdmin: true,
            accountVerifiedAt: true,
            accountLockedAt: true,
            password: true,
            teamPermissions: {
                where: {
                    isEnabled: true,
                    team: {
                        deactivatedAt: null,
                    },
                },
                select: {
                    isEnabled: true,
                    ...teamPermissionSelection,
                    team: {
                        select: {
                            id: true,
                            teamName: true,
                            deactivatedAt: true,
                            isInternalAdminTeam: true,
                            isTeamApprovedByAdmin: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: SortOrder.desc,
                },
            },
        },
    });

    const defaultTeamId = userByEmail
        ? filterValidTeamPermissions(userByEmail.teamPermissions)[0]?.team.id
        : undefined;

    if (!userByEmail) {
        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: normalizedEmailAddress,
                outcome: AuthenticationOutcome.FailedUserNotFound,
            },
            relations: {},
        });
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (userByEmail.accountLockedAt) {
        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: normalizedEmailAddress,
                outcome: AuthenticationOutcome.AccountLocked,
            },
            relations: {
                userId: userByEmail.id,
                teamId: defaultTeamId,
            },
        });

        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (!userByEmail.password) {
        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: normalizedEmailAddress,
                outcome: AuthenticationOutcome.UserHasNoPassword,
            },
            relations: {
                userId: userByEmail.id,
                teamId: defaultTeamId,
            },
        });
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (
        !(await doesPasswordMatchHash({
            password: requestData.password,
            hash: userByEmail.password,
        }))
    ) {
        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: normalizedEmailAddress,
                outcome: AuthenticationOutcome.FailedWrongPassword,
            },
            relations: {
                userId: userByEmail.id,
                teamId: defaultTeamId,
            },
        });

        /** Check if this failed attempt should trigger account lockout. */
        if (
            await shouldLockAccount({
                context,
                userId: userByEmail.id,
            })
        ) {
            await context.prismaClient.user.update({
                where: {
                    id: userByEmail.id,
                },
                data: {
                    accountLockedAt: getNowInIsoString(),
                },
                select: {
                    id: true,
                },
            });

            await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
                data: {
                    emailAddress: normalizedEmailAddress,
                    outcome: AuthenticationOutcome.AccountLocked,
                },
                relations: {
                    userId: userByEmail.id,
                    teamId: defaultTeamId,
                },
            });

            return {
                statusCode: HttpStatus.Forbidden,
            };
        }

        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (userByEmail.accountVerifiedAt) {
        const headers = await context.backendAuthClient.createLoginHeaders({
            userId: userByEmail.id,
            isSignUpCookie: false,
            requestHeaders: request.headers,
        });

        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: normalizedEmailAddress,
                outcome: AuthenticationOutcome.LoginSuccess,
            },
            relations: {
                userId: userByEmail.id,
                teamId: defaultTeamId,
            },
        });

        return {
            statusCode: HttpStatus.Ok,
            responseData: createUserResponse(
                userByEmail,
                getSelectedTeamIdFromHeaders(requestHeaders),
            ),
            headers,
        };
    } else {
        /**
         * Send another account verification code if their email / account has still not been
         * verified.
         */
        await context.emailClient.sendVerificationCode({
            request,
            toEmailAddress: userByEmail.emailAddress,
            codeForUser: userByEmail,
            codeType: EmailCodeType.AccountVerification,
            relevantTeam: undefined,
        });

        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: normalizedEmailAddress,
                outcome: AuthenticationOutcome.LoginSuccess,
            },
            relations: {
                userId: userByEmail.id,
                teamId: defaultTeamId,
            },
        });

        const headers = await context.backendAuthClient.createLoginHeaders({
            userId: userByEmail.id,
            isSignUpCookie: true,
            requestHeaders: request.headers,
        });

        return {
            headers,
            statusCode: HttpStatus.Ok,
            responseData: {
                emailSent: true,
            },
        };
    }
}
