import {getObjectTypedEntries, type PartialWithNullable} from '@augment-vir/common';
import {type Team, type TeamPermissionField} from '@evir/common';
import {type RequireAtLeastOne} from 'type-fest';
import {type AuthenticatedUser} from '../backend-client-interface/clients/backend-auth.client.js';

export function hasValidTeamPermission(
    authenticatedUser: Readonly<AuthenticatedUser>,
    requiredPermissions: RequireAtLeastOne<Record<TeamPermissionField, boolean>>,
): boolean {
    if (authenticatedUser.isInternalAdmin) {
        return true;
    } else if (
        !authenticatedUser.isUserApprovedByAdmin ||
        !authenticatedUser.accountVerifiedAt ||
        !authenticatedUser.selectedTeam ||
        !authenticatedUser.selectedTeam.team.isTeamApprovedByAdmin
    ) {
        return false;
    } else {
        return getObjectTypedEntries(requiredPermissions).every(
            ([
                permission,
                isRequired,
            ]) => {
                if (isRequired) {
                    return !!authenticatedUser.selectedTeam?.[permission];
                } else {
                    /** If the permission is not required, then we don't need to check it. */
                    return true;
                }
            },
        );
    }
}

export function getTeamIdToUpdate(
    authenticatedUser: Readonly<AuthenticatedUser>,
    requestData: Readonly<PartialWithNullable<{teamId: Team['id']}>>,
): Team['id'] | undefined {
    return (
        (authenticatedUser.isInternalAdmin ? requestData.teamId : undefined) ||
        authenticatedUser.selectedTeam?.team.id ||
        undefined
    );
}
