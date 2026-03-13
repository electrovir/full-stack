import {EmailCodeType} from '@evir/common';

export enum EmailSuccessType {
    AccountCreated = 'account-created',
    /** For when a user has forgotten their password and a password reset email was sent. */
    ForgotPassword = 'forgot-password',
    /** For when a user has logged in but is required to change their password. */
    PasswordReset = 'password-reset',
}

export const emailSuccessTypeToEmailCodeType: Record<EmailSuccessType, EmailCodeType> = {
    [EmailSuccessType.AccountCreated]: EmailCodeType.AccountVerification,
    [EmailSuccessType.ForgotPassword]: EmailCodeType.PasswordReset,
    [EmailSuccessType.PasswordReset]: EmailCodeType.PasswordReset,
};
