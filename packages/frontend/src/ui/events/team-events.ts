import {assert, assertWrap} from '@augment-vir/assert';
import {copyThroughJson, stringify} from '@augment-vir/common';
import {type BackendService, type User} from '@evir/common';
import {type AsyncProp, defineTypedEvent} from 'element-vir';
import {handleError} from 'sentry-vir';
import {type ArrayElement} from 'type-fest';

/** Used to trigger the team page to reload all of its data. */
export const TeamReloadEvent = defineTypedEvent<
    | undefined
    | {
          newUserId?: User['id'] | undefined;
      }
>()('team-reload');

export type TeamUpdate =
    | {
          teamUpdate: Partial<BackendService['endpoints']['/team/get']['ResponseType']['team']>;
      }
    | {
          userId: User['id'];
          userUpdate: Partial<
              ArrayElement<BackendService['endpoints']['/team/get']['ResponseType']['users']>
          >;
      };

/** Used to update the existing team page data in place, without reloading everything. */
export const TeamUpdateEvent = defineTypedEvent<TeamUpdate>()('team-update');

export function handleTeamUpdateEvent(
    teamData: AsyncProp<BackendService['endpoints']['/team/get']['ResponseType'], any>,
    updateData: TeamUpdate,
) {
    if (teamData.value instanceof Promise) {
        handleError(new Error('Cannot update promise team data.'));
        return;
    } else if (teamData.value instanceof Error) {
        handleError(new Error('Cannot update error team data.'));
        return;
    }

    const newData: typeof teamData.value = copyThroughJson(teamData.value);

    if ('teamUpdate' in updateData) {
        Object.assign(newData.team, updateData.teamUpdate);
    } else if ('userId' in updateData) {
        const user = assertWrap.isDefined(
            newData.users.find((u) => u.id === updateData.userId),
            `No user found to update: '${updateData.userId}'`,
        );
        Object.assign(user, updateData.userUpdate);
    } else {
        assert.tsType(updateData).equals<never>();
        assert.never(`Unexpected updateData: ${stringify(updateData)}`);
    }

    teamData.setValue(newData);
}
