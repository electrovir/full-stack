import {type Values} from '@augment-vir/common';
import {csrfTokenHeaderName} from 'auth-vir';

export const HeaderName = {
    CsrfToken: csrfTokenHeaderName,
    UserStatus: 'user-status',
};
export type HeaderName = Values<typeof HeaderName>;

export enum UserStatusHeaderValue {
    SignUp = 'sign-up',
}
