import {
    HttpStatus,
    replaceNullValuesWithUndefined,
    selectFrom,
    type SelectFrom,
} from '@augment-vir/common';
import {
    filterValidTeamPermissions,
    teamPermissionSelection,
    type BackendService,
    type FullModel,
    type ModelName,
    type Team,
    type TeamPermissionSelection,
    type UserResponse,
} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {type BackendContext} from '../context/create-backend-context.js';

export function userEndpoint(
    this: void,
    {context}: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/user']>,
): EndpointImplementationOutput<BackendService['endpoints']['/user']['ResponseType']> {
    const user = context.authenticatedUser || context.signUpAuthenticatedUser;

    if (!user) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    }

    return {
        statusCode: HttpStatus.Ok,
        responseData: createUserResponse(user, context.authenticatedUser?.selectedTeam?.team.id),
    };
}

export function createUserResponse(
    originalUser: SelectFrom<
        FullModel<typeof ModelName.User>,
        {
            id: true;
            isUserApprovedByAdmin: true;
            emailAddress: true;
            humanName: true;
            isInternalAdmin: true;
            accountVerifiedAt: true;

            teamPermissions: TeamPermissionSelection & {
                isEnabled: true;

                team: {
                    id: true;
                    teamName: true;
                    deactivatedAt: true;
                    isInternalAdminTeam: true;
                    isTeamApprovedByAdmin: true;
                };
            };
        }
    >,
    selectedTeamId: Team['id'] | undefined,
): UserResponse {
    const validTeamPermissions = filterValidTeamPermissions(originalUser.teamPermissions);

    const selectedTeamPermission =
        (selectedTeamId &&
            validTeamPermissions.find(
                (teamPermission) => teamPermission.team.id === selectedTeamId,
            )) ||
        validTeamPermissions[0];

    return replaceNullValuesWithUndefined({
        ...selectFrom(originalUser, {
            id: true,
            emailAddress: true,
            humanName: true,
        }),
        isInternalAdmin:
            (originalUser.isInternalAdmin && selectedTeamPermission?.team.isInternalAdminTeam) ||
            undefined,
        isVerified: !!originalUser.accountVerifiedAt,
        isApproved: originalUser.isUserApprovedByAdmin,
        teams: validTeamPermissions.map((teamPermission) => {
            return selectFrom(teamPermission.team, {
                id: true,
                teamName: true,
            });
        }),
        selectedTeam: selectedTeamPermission && {
            team: selectFrom(selectedTeamPermission.team, {
                id: true,
                teamName: true,
            }),
            ...selectFrom(selectedTeamPermission, teamPermissionSelection),
        },
    });
}
