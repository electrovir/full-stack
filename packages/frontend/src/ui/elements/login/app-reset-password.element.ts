import {ensureError, extractErrorMessage, log, type Values} from '@augment-vir/common';
import {frontendPathTree} from '@evir/common';
import {css, html, listen} from 'element-vir';
import {isValidEmailAddress} from 'parse-email-address';
import {type RequireExactlyOne} from 'type-fest';
import {noNativeSpacing, ViraLink} from 'vira';
import {EmailSuccessType} from '../../../data/email-success-type.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppEmailSuccess} from '../verify-code/app-email-success.element.js';
import {AppCredentials, type CredentialErrors} from './app-credentials.element.js';

export type PasswordResetResult = RequireExactlyOne<{
    success: {
        emailAddress: string;
    };
    failure: Omit<CredentialErrors, 'password'>;
}>;

export async function beginPasswordReset(
    frontendState: Readonly<FrontendState>,
    emailAddress: string,
): Promise<PasswordResetResult> {
    try {
        if (!isValidEmailAddress(emailAddress)) {
            return {
                failure: {
                    email: frontendState.i18nClient.get.AppCreateAccount.invalidEmailErrorMessage,
                },
            };
        }

        const output = await frontendState.apiClient.endpoints['/reset-password'].fetch({
            requestData: {
                emailAddress,
            },
        });

        if (output.ok) {
            return {
                success: {
                    emailAddress,
                },
            };
        } else {
            throw new Error(output.data);
        }
    } catch (error) {
        log.error(ensureError(error));
        return {
            failure: {
                generic:
                    extractErrorMessage(error) ||
                    frontendState.i18nClient.get.AppResetPassword.passwordResetFailed,
            },
        };
    }
}

export const ResetPasswordType = {
    ForgotPassword: EmailSuccessType.ForgotPassword,
    ResetPassword: EmailSuccessType.PasswordReset,
};
export type ResetPasswordType = Values<typeof ResetPasswordType>;

export const AppResetPassword = defineAppElement<{
    frontendState: Readonly<FrontendState>;
    resetType: ResetPasswordType;
}>()({
    tagName: 'app-reset-password',
    state() {
        return {
            emailInput: '',
            isLoading: false,
            errors: undefined as undefined | Readonly<Omit<CredentialErrors, 'password'>>,

            linkSentTo: undefined as undefined | {emailAddress: string},
        };
    },
    styles: css`
        :host {
            display: flex;
            max-width: 100%;
            flex-direction: column;
            gap: 32px;
            align-items: center;
        }

        p {
            ${noNativeSpacing};
        }
    `,
    render({state, updateState, inputs}) {
        if (state.linkSentTo) {
            return html`
                <${AppEmailSuccess.assign({
                    emailAddress: state.linkSentTo.emailAddress,
                    successType: inputs.resetType,
                    frontendState: inputs.frontendState,
                    emailSentJustNow: true,
                })}></${AppEmailSuccess}>
            `;
        } else {
            return html`
                <p>${inputs.frontendState.i18nClient.get.AppResetPassword.enterEmailPrompt}</p>
                <${AppCredentials.assign({
                    ...inputs,
                    emailInput: state.emailInput,
                    errors: state.errors,
                    infoLines: [
                        inputs.frontendState.i18nClient.get.AppResetPassword
                            .passwordResetWillBeSent,
                        html`
                            ${inputs.frontendState.i18nClient.get.AppResetPassword
                                .rememberYourPassword}
                            <${ViraLink.assign({
                                route: {
                                    router: inputs.frontendState.router,
                                    route: {
                                        paths: frontendPathTree.paths.fullPaths,
                                    },
                                },
                            })}>
                                ${inputs.frontendState.i18nClient.get.AppResetPassword
                                    .returnToSignIn}
                            </${ViraLink}>
                        `,
                    ],
                    isCreatingAccount: false,
                    isLoading: state.isLoading,
                    passwordInput: undefined,
                    submitButtonText:
                        inputs.frontendState.i18nClient.get.AppResetPassword
                            .submitPasswordResetButton,
                })}
                    ${listen(AppCredentials.events.credentialsUpdate, (event) => {
                        updateState({
                            emailInput: event.detail.emailAddress,
                        });
                    })}
                    ${listen(AppCredentials.events.submit, async () => {
                        try {
                            updateState({
                                errors: undefined,
                                isLoading: true,
                            });
                            const result = await beginPasswordReset(
                                inputs.frontendState,
                                state.emailInput,
                            );
                            if (result.success) {
                                updateState({
                                    linkSentTo: {
                                        emailAddress: result.success.emailAddress,
                                    },
                                });
                            } else {
                                updateState({
                                    errors: {
                                        ...state.errors,
                                        ...result.failure,
                                    },
                                });
                            }
                        } finally {
                            updateState({
                                isLoading: false,
                            });
                        }
                    })}
                ></${AppCredentials}>
            `;
        }
    },
});
