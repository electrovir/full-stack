import {assert, assertWrap} from '@augment-vir/assert';
import {copyThroughJson, stringify} from '@augment-vir/common';
import {type BackendService, type Team, type TeamFilter, type User} from '@evir/common';
import {type AsyncProp, defineTypedEvent} from 'element-vir';
import {sendLog} from 'sentry-vir';
import {type ArrayElement, type RequireExactlyOne} from 'type-fest';

/**
 * Used to trigger the internal admin's team tab to reload all of its data. This is needed, for
 * example, when creating a new team or user.
 */
export const AdminTeamReloadEvent = defineTypedEvent<
    | undefined
    | RequireExactlyOne<{
          newTeam:
              | {
                    newTeamId: Team['id'];
                    teamFilter: TeamFilter;
                }
              | undefined;
          newUserId: User['id'] | undefined;
      }>
>()('admin-team-reload');

export type AdminTeamUpdate =
    | {
          teamId: Team['id'];
          teamUpdate: Partial<
              ArrayElement<
                  BackendService['endpoints']['/internal-admin/team-list']['ResponseType']
              >['team']
          >;
      }
    | {
          userId: User['id'];
          userUpdate: Partial<
              ArrayElement<
                  ArrayElement<
                      BackendService['endpoints']['/internal-admin/team-list']['ResponseType']
                  >['users']
              >
          >;
      };

/** Used to update the existing admin's team tab data in place, without reloading everything. */
export const AdminTeamUpdateEvent = defineTypedEvent<AdminTeamUpdate>()('admin-team-update');

export function handleAdminTeamUpdateEvent(
    teamList: AsyncProp<
        BackendService['endpoints']['/internal-admin/team-list']['ResponseType'],
        any
    >,
    updateData: AdminTeamUpdate,
) {
    if (teamList.value instanceof Promise) {
        sendLog.warning('Cannot update promise admin team list.');
        return;
    } else if (teamList.value instanceof Error) {
        sendLog.warning('Cannot update error admin team list.');
        return;
    }

    const newData: typeof teamList.value = copyThroughJson(teamList.value);

    if ('teamId' in updateData) {
        const teamEntry = assertWrap.isDefined(
            newData.find((team) => team.team.id === updateData.teamId),
            `No team found to update: '${updateData.teamId}'`,
        );
        Object.assign(teamEntry.team, updateData.teamUpdate);
    } else if ('userId' in updateData) {
        const users = newData.flatMap((team) => team.users) satisfies Partial<User>[];

        Object.assign(
            assertWrap.isDefined(
                users.find((user) => user.id === updateData.userId),
                `No user found to update: '${updateData.userId}'`,
            ),
            updateData.userUpdate,
        );
    } else {
        assert.tsType(updateData).equals<never>();
        assert.never(`Unexpected updateData: ${stringify(updateData)}`);
    }

    teamList.setValue(newData);
}
