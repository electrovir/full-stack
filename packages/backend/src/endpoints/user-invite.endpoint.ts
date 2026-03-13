import {isErrorHttpStatus, stringify, type SelectFrom} from '@augment-vir/common';
import {EmailCodeType, type BackendService, type Team, type User} from '@evir/common';
import {
    HttpStatus,
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {normalizeEmailAddress} from 'parse-email-address';
import {throwWithExtraContext} from 'sentry-vir';
import {
    hasAuthenticatedUser,
    type BackendContext,
    type BackendContextWithAuthenticatedUser,
} from '../context/create-backend-context.js';
import {createNewUser} from './common/create-user.js';

/**
 * Handles inviting an existing user to a new team. Sends an invite email with a verification code
 * that, when accepted, will create the team permission.
 */
async function sendExistingUserTeamInvite({
    context,
    request,
    existingUser,
    teamId,
}: {
    context: BackendContextWithAuthenticatedUser;
    request: Parameters<typeof context.emailClient.sendVerificationCode>[0]['request'];
    existingUser: Readonly<
        SelectFrom<
            User,
            {
                id: true;
                emailAddress: true;
                humanName: true;
                accountVerifiedAt: true;
                password: true;
            }
        >
    >;
    teamId: Team['id'];
}): Promise<void> {
    const team = await context.prismaClient.team.findUnique({
        where: {
            id: teamId,
        },
        select: {
            id: true,
            teamName: true,
        },
    });

    if (!team) {
        throwWithExtraContext('Failed to find team to invite user to.', {
            context: {
                invitedEmail: existingUser.emailAddress,
                teamId,
                inviterUseId: context.authenticatedUser.id,
            },
            tags: {
                teamId,
                userId: context.authenticatedUser.id,
            },
        });
    }

    await context.emailClient.sendVerificationCode({
        request,
        relevantTeam: team,
        toEmailAddress: existingUser.emailAddress,
        codeForUser: existingUser,
        codeType: EmailCodeType.UserInvitation,
    });
}

export async function userInviteEndpoint(
    this: void,
    {
        context,
        requestData,
        request,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/user/invite']>,
): Promise<
    EndpointImplementationOutput<BackendService['endpoints']['/user/invite']['ResponseType']>
> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    }

    const normalizedEmail = normalizeEmailAddress(requestData.emailAddress);

    const existingUser = normalizedEmail
        ? await context.prismaClient.user.findFirst({
              where: {
                  normalizedEmailAddress: normalizedEmail,
                  deactivatedAt: null,
              },
              select: {
                  id: true,
                  emailAddress: true,
                  humanName: true,
                  accountVerifiedAt: true,
                  password: true,
                  teamPermissions: {
                      where: {
                          teamId: requestData.teamId,
                          isEnabled: true,
                          team: {
                              deactivatedAt: null,
                          },
                      },
                      select: {
                          id: true,
                      },
                      take: 1,
                  },
              },
          })
        : undefined;

    if (existingUser) {
        const alreadyOnTeam = existingUser.teamPermissions.length > 0;

        if (alreadyOnTeam) {
            return {
                statusCode: HttpStatus.Conflict,
                responseErrorMessage: 'User is already a member of this team.',
            };
        }

        await sendExistingUserTeamInvite({
            context,
            request,
            existingUser,
            teamId: requestData.teamId,
        });

        return {
            statusCode: HttpStatus.Ok,
        };
    }

    const result = await createNewUser(
        true,
        {
            requireEmailVerification: false,
            teamId: requestData.teamId,
            emailAddress: requestData.emailAddress,
            password: undefined,
            selfServeInfo: undefined,
        },
        {
            context,
            request,
        },
    );

    const userId = result.userId;

    if (context.authenticatedUser.isInternalAdmin) {
        if (userId) {
            return {
                statusCode: HttpStatus.Ok,
                responseData: {
                    id: userId,
                },
            };
        } else if (isErrorHttpStatus(result.statusCode)) {
            return {
                statusCode: result.statusCode,
                responseErrorMessage: result.responseErrorMessage,
            };
        }
    } else {
        /**
         * For non-admins, don't return any error response. Otherwise, they can use this endpoint
         * for email lookup attacks.
         */
        return {
            statusCode: HttpStatus.Ok,
        };
    }
    throw new Error(`Unexpected create user result ${stringify(result)}`);
}
