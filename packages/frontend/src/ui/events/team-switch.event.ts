import {type Team} from '@evir/common';
import {defineTypedEvent} from 'element-vir';

export const TeamSwitchEvent = defineTypedEvent<Team['id']>()('app-team-switch');
