import {selectFrom} from '@augment-vir/common';
import {type BackendService, SortOrder, teamPermissionSelection} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {type BackendContext, hasAuthenticatedUser} from '../context/create-backend-context.js';

export async function teamGetEndpoint(
    this: void,
    {
        context,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/team/get']>,
): Promise<EndpointImplementationOutput<BackendService['endpoints']['/team/get']['ResponseType']>> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (!context.authenticatedUser.selectedTeam) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'No selected team.',
        };
    }

    const team = await context.prismaClient.team.findUnique({
        where: {
            id: context.authenticatedUser.selectedTeam.team.id,
            deactivatedAt: null,
        },
        select: {
            id: true,
            teamName: true,
            isTeamApprovedByAdmin: true,
            teamPermissions: {
                where: {
                    isEnabled: true,
                    user: {
                        deactivatedAt: null,
                        accountVerifiedAt: {
                            /**
                             * Do not show invited but not activated users to non-admins as doing so
                             * would allow email-lookup attacks.
                             */
                            not: null,
                        },
                    },
                },
                select: {
                    ...teamPermissionSelection,
                    user: {
                        select: {
                            id: true,
                            emailAddress: true,
                            humanName: true,
                            accountVerifiedAt: true,
                            accountLockedAt: true,
                        },
                    },
                },
                orderBy: {
                    user: {
                        createdAt: SortOrder.asc,
                    },
                },
            },
        },
    });

    if (!team) {
        return {
            statusCode: HttpStatus.NotFound,
        };
    } else if (!team.isTeamApprovedByAdmin) {
        return {
            statusCode: HttpStatus.Forbidden,
        };
    }

    const users = team.teamPermissions.map((tp) => ({
        ...tp.user,
        canManageUsers: tp.canManageUsers,
        canEditTeamDetails: tp.canEditTeamDetails,
    }));

    return {
        statusCode: HttpStatus.Ok,
        responseData: {
            team: selectFrom(team, {
                id: true,
                teamName: true,
            }),
            users: context.authenticatedUser.selectedTeam.canManageUsers
                ? selectFrom(users, {
                      id: true,
                      emailAddress: true,
                      humanName: true,
                      accountVerifiedAt: true,
                      accountLockedAt: true,
                      ...teamPermissionSelection,
                  })
                : [],
        },
    };
}
