import {defineTypedEvent} from 'element-vir';
import {type UserThemeSelection} from '../../data/user-theme-selection.js';

export const UserThemeSelectEvent = defineTypedEvent<UserThemeSelection>()('user-theme-select');
