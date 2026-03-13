import {mapObject, type SelectFrom} from '@augment-vir/common';
import {type FullModel, type ModelName} from '@evir/common';
import {TeamPermissionShape, type TeamPermission} from '../database-exports-for-common.js';

/** Extracts all `can*` permission field names from the TeamPermission model. */
export type TeamPermissionField = Extract<keyof TeamPermission, `can${string}`>;

/** A record mapping each `can*` field to `true`, useful for Prisma selects. */
export type TeamPermissionSelection = Record<TeamPermissionField, true>;

/**
 * Runtime object mapping each `can*` key in the TeamPermission model to `true`. Used for dynamic
 * iteration over permission fields for Prisma selects and form generation.
 */
export const teamPermissionSelection = mapObject(TeamPermissionShape.default, (key) => {
    if (key.startsWith('can')) {
        return {
            key,
            value: true,
        };
    } else {
        return undefined;
    }
}) as TeamPermissionSelection;

export function filterValidTeamPermissions<
    const Permissions extends SelectFrom<
        FullModel<typeof ModelName.TeamPermission>,
        {
            isEnabled: true;

            team: {
                deactivatedAt: true;
                isTeamApprovedByAdmin: true;
            };
        }
    >,
>(permissions: ReadonlyArray<Readonly<Permissions>>) {
    return permissions.filter((teamPermission) => {
        return (
            teamPermission.isEnabled &&
            !teamPermission.team.deactivatedAt &&
            teamPermission.team.isTeamApprovedByAdmin
        );
    });
}
