import {type UserResponse} from '@evir/common';
import {defineTypedEvent} from 'element-vir';

export const UserEditEvent = defineTypedEvent<Partial<UserResponse>>()('app-user-edit');
