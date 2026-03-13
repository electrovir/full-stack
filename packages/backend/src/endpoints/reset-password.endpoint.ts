import {
    AuthenticationOutcome,
    type BackendService,
    DeployEnv,
    EmailCodeType,
    EventLogName,
    SortOrder,
} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {normalizeEmailAddress} from 'parse-email-address';
import {type BackendContext} from '../context/create-backend-context.js';

export async function resetPasswordEndpoint(
    this: void,
    {
        context,
        requestData,
        request,
        log,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/reset-password']>,
): Promise<
    EndpointImplementationOutput<BackendService['endpoints']['/reset-password']['ResponseType']>
> {
    const normalizedEmailAddress = normalizeEmailAddress(requestData.emailAddress);

    /** If email normalization fails, still return OK for security reasons. */
    if (!normalizedEmailAddress) {
        return {
            statusCode: HttpStatus.Ok,
        };
    }

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
            emailAddress: true,
            humanName: true,
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

    const existingTeamPermission = existingUser?.teamPermissions[0];

    if (existingUser && existingTeamPermission) {
        const result = await context.emailClient.sendVerificationCode({
            request,
            relevantTeam: existingTeamPermission.team,
            toEmailAddress: existingUser.emailAddress,
            codeForUser: existingUser,
            codeType: EmailCodeType.PasswordReset,
        });

        if (!result) {
            return {
                statusCode: HttpStatus.TooManyRequests,
                responseErrorMessage:
                    'Please wait a few minutes before resetting your password again.',
            };
        }

        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: normalizedEmailAddress,
                outcome: AuthenticationOutcome.PasswordResetRequested,
            },
            relations: {
                userId: existingUser.id,
                teamId: existingTeamPermission.team.id,
            },
        });
    } else {
        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: normalizedEmailAddress,
                outcome: AuthenticationOutcome.FailedUserNotFound,
            },
            relations: {},
        });

        if (context.backendEnvClient.deployEnv == DeployEnv.Dev) {
            log.error(
                new Error(
                    `Cannot send password reset email to missing user ${requestData.emailAddress}`,
                ),
            );
        }
    }

    /** When no user exists, don't return an error message (to prevent email enumeration attacks). */
    return {
        statusCode: HttpStatus.Ok,
    };
}
