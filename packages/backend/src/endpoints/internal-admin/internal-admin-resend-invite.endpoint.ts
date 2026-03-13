import {type BackendService, EmailCodeType} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {type BackendContext, hasAuthenticatedUser} from '../../context/create-backend-context.js';

export async function internalAdminResendInviteEndpoint(
    this: void,
    {
        context,
        requestData,
        request,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/internal-admin/resend-invite']
    >,
): Promise<
    EndpointImplementationOutput<
        BackendService['endpoints']['/internal-admin/resend-invite']['ResponseType']
    >
> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (!context.authenticatedUser.isInternalAdmin) {
        return {
            statusCode: HttpStatus.Forbidden,
        };
    }

    const invitedUser = await context.prismaClient.user.findUnique({
        where: {
            id: requestData.userId,
            accountVerifiedAt: null,
            password: null,
            deactivatedAt: null,

            teamPermissions: {
                some: {
                    teamId: requestData.teamId,
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
                    teamId: requestData.teamId,
                    isEnabled: true,
                },
                select: {
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

    const invitedTeamPermission = invitedUser?.teamPermissions[0];

    if (!invitedUser || !invitedTeamPermission) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Invalid user to resend invite to.',
        };
    }

    await context.emailClient.clearVerificationCodes({
        byUser: {
            codeType: EmailCodeType.UserInvitation,
            userId: invitedUser.id,
        },
    });

    await context.emailClient.sendVerificationCode({
        request,
        relevantTeam: invitedTeamPermission.team,
        toEmailAddress: invitedUser.emailAddress,
        codeForUser: invitedUser,
        codeType: EmailCodeType.UserInvitation,
    });

    return {
        statusCode: HttpStatus.Ok,
    };
}
