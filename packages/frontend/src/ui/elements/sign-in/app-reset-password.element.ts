import {combineErrorMessages, ensureError, extractErrorMessage, log} from '@augment-vir/common';
import {css, defineElement, html, listen} from 'element-vir';
import {isValidEmailAddress} from 'parse-email-address';
import {noNativeSpacing} from 'vira';
import {type FullyResolvedFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {AppEmailSuccess, EmailSuccessType} from '../verify-code/app-email-success.element.js';
import {knownAccountCreationErrors} from './app-create-account.element.js';
import {AppCredentials, type CredentialErrors} from './app-credentials.element.js';

export const AppResetPassword = defineElement<Readonly<Pick<FullyResolvedFrontendState, 'api'>>>()({
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
        async function submitPasswordReset() {
            try {
                const emailAddress = state.emailInput;

                updateState({
                    errors: undefined,
                    isLoading: true,
                });

                if (!isValidEmailAddress(emailAddress)) {
                    updateState({
                        errors: {
                            ...state.errors,
                            email: knownAccountCreationErrors.invalidEmail,
                        },
                    });
                    return;
                }

                const output = await inputs.api.endpoints['/reset-password'].fetch({
                    requestData: {
                        emailAddress,
                    },
                });

                if (output.ok) {
                    updateState({
                        linkSentTo: {
                            emailAddress,
                        },
                    });
                } else {
                    throw new Error(output.data);
                }
            } catch (error) {
                log.error(ensureError(error));

                updateState({
                    errors: {
                        ...state.errors,
                        generic: combineErrorMessages(
                            'Password reset failed.',
                            extractErrorMessage(error),
                        ),
                    },
                });
            } finally {
                updateState({
                    isLoading: false,
                });
            }
        }

        if (state.linkSentTo) {
            return html`
                <${AppEmailSuccess.assign({
                    emailAddress: state.linkSentTo.emailAddress,
                    successType: EmailSuccessType.PasswordReset,
                })}></${AppEmailSuccess}>
            `;
        } else {
            return html`
                <p>Enter your account's email address to reset your password:</p>
                <${AppCredentials.assign({
                    emailInput: state.emailInput,
                    errors: state.errors,
                    infoLines: [
                        'A password reset link will be emailed to you.',
                    ],
                    isCreatingAccount: false,
                    isLoading: state.isLoading,
                    passwordInput: undefined,
                    submitButtonText: 'Reset Password',
                })}
                    ${listen(AppCredentials.events.credentialsUpdate, (event) => {
                        updateState({
                            emailInput: event.detail.emailAddress,
                        });
                    })}
                    ${listen(AppCredentials.events.submit, async () => {
                        await submitPasswordReset();
                    })}
                ></${AppCredentials}>
            `;
        }
    },
});
