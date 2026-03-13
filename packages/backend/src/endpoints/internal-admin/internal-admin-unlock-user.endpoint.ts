import {type BackendService, EmailCodeType, SortOrder} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {type BackendContext, hasAuthenticatedUser} from '../../context/create-backend-context.js';

export async function internalAdminUnlockUserEndpoint(
    this: void,
    {
        context,
        requestData,
        request,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/internal-admin/unlock-user']
    >,
): Promise<
    EndpointImplementationOutput<
        BackendService['endpoints']['/internal-admin/unlock-user']['ResponseType']
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

    const user = await context.prismaClient.user.findUnique({
        where: {
            id: requestData.id,
            deactivatedAt: null,
            accountLockedAt: {
                not: null,
            },
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

    if (!user) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'User is not locked or does not exist.',
        };
    }

    const activeTeam = user.teamPermissions[0]?.team;

    if (!activeTeam) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'User has no active team.',
        };
    }

    /** Unlock the user and clear their password so they must reset it. */
    await context.prismaClient.user.update({
        where: {
            id: user.id,
        },
        data: {
            accountLockedAt: null,
            password: null,
        },
    });

    /** Send a password reset email so the user can set a new password. */
    await context.emailClient.sendVerificationCode({
        request,
        relevantTeam: activeTeam,
        toEmailAddress: user.emailAddress,
        codeForUser: user,
        codeType: EmailCodeType.PasswordReset,
    });

    return {
        statusCode: HttpStatus.Ok,
    };
}
