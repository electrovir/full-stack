import {selectFrom} from '@augment-vir/common';
import {
    type BackendService,
    SortOrder,
    TeamFilter,
    type TeamWhereInput,
    teamPermissionSelection,
} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {type BackendContext, hasAuthenticatedUser} from '../../context/create-backend-context.js';

const teamFilterWhereClause: Record<TeamFilter, TeamWhereInput> = {
    [TeamFilter.Approved]: {
        isTeamApprovedByAdmin: true,
        isTestTeam: false,
        isInternalAdminTeam: false,
        deactivatedAt: null,
    },
    [TeamFilter.NotApproved]: {
        isTeamApprovedByAdmin: false,
        isTestTeam: false,
        isInternalAdminTeam: false,
        deactivatedAt: null,
    },
    [TeamFilter.Test]: {
        isInternalAdminTeam: false,
        isTestTeam: true,
        deactivatedAt: null,
    },
    [TeamFilter.Admin]: {
        isInternalAdminTeam: true,
        isTestTeam: false,
        deactivatedAt: null,
    },
    [TeamFilter.Deactivated]: {
        deactivatedAt: {
            not: null,
        },
    },
    [TeamFilter.Active]: {
        deactivatedAt: null,
    },
};

export async function internalAdminTeamListEndpoint(
    this: void,
    {
        context,
        requestData,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/internal-admin/team-list']
    >,
): Promise<
    EndpointImplementationOutput<
        BackendService['endpoints']['/internal-admin/team-list']['ResponseType']
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

    const teams = await context.prismaClient.team.findMany({
        where: teamFilterWhereClause[requestData.teamFilter],
        select: {
            id: true,
            teamName: true,
            isInternalAdminTeam: true,
            isTestTeam: true,
            isTeamApprovedByAdmin: true,
            deactivatedAt: true,

            teamPermissions: {
                where: {
                    isEnabled: true,
                    user: {
                        deactivatedAt: null,
                    },
                },
                select: {
                    ...teamPermissionSelection,
                    user: {
                        select: {
                            id: true,
                            emailAddress: true,
                            humanName: true,
                            isInternalAdmin: true,
                            isTestUser: true,
                            accountVerifiedAt: true,
                            accountLockedAt: true,
                            deactivatedAt: true,
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

    return {
        statusCode: HttpStatus.Ok,
        responseData: teams.map((team) => {
            const users = team.teamPermissions.map((tp) => ({
                ...tp.user,
                canManageUsers: tp.canManageUsers,
                canEditTeamDetails: tp.canEditTeamDetails,
            }));

            return {
                team: selectFrom(team, {
                    id: true,
                    teamName: true,
                    isInternalAdminTeam: true,
                    isTestTeam: true,
                    isTeamApprovedByAdmin: true,
                    deactivatedAt: true,
                }),
                users: selectFrom(users, {
                    id: true,
                    emailAddress: true,
                    humanName: true,
                    isInternalAdmin: true,
                    isTestUser: true,
                    accountVerifiedAt: true,
                    accountLockedAt: true,
                    ...teamPermissionSelection,
                }),
            };
        }),
    };
}
