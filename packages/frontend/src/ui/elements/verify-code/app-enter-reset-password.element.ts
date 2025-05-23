import {extractErrorMessage} from '@augment-vir/common';
import {EmailCodeType, preparePassword} from '@evir/common';
import {css, defineElement, html, listen} from 'element-vir';
import {noNativeSpacing} from 'vira';
import {type FullyResolvedFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appCssVars} from '../../styles/css-vars.js';
import {createPasswordLengthInfo} from '../sign-in/app-create-account.element.js';
import {AppCredentials} from '../sign-in/app-credentials.element.js';
import {AppSignIn} from '../sign-in/app-sign-in.element.js';

/** Used to enter a new password after the user has verified their password reset email code link. */
export const AppEnterResetPassword = defineElement<
    Readonly<{
        emailCode: Readonly<{
            code: string;
            codeType: EmailCodeType;
            codeId: string;
        }>;
        frontendState: Readonly<Pick<FullyResolvedFrontendState, 'api' | 'config' | 'router'>>;
    }>
>()({
    tagName: 'app-enter-reset-password',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: ${appCssVars['app-content-padding'].value};
            align-items: center;
        }

        p {
            ${noNativeSpacing};
        }

        ${AppSignIn} {
            align-self: stretch;
        }
    `,
    state() {
        return {
            passwordInput: '',
            isLoading: false,
            errorMessage: '',
            isFinished: false,
        };
    },
    render({inputs, state, updateState}) {
        async function submitNewPassword() {
            updateState({
                errorMessage: '',
                isLoading: true,
            });
            try {
                if (inputs.emailCode.codeType !== EmailCodeType.PasswordReset) {
                    throw new Error('Cannot reset password with non-password-reset code.');
                }

                const newPassword = state.passwordInput;

                const preparedPassword = await preparePassword(
                    newPassword,
                    inputs.frontendState.config,
                );
                if (preparedPassword.failureReason) {
                    updateState({
                        errorMessage: preparedPassword.failureReason,
                    });
                    return;
                }

                const output = await inputs.frontendState.api.endpoints['/verify'].fetch({
                    requestData: {
                        code: inputs.emailCode.code,
                        codeType: inputs.emailCode.codeType,
                        id: inputs.emailCode.codeId,
                        newPassword: state.passwordInput,
                    },
                });

                if (output.ok) {
                    updateState({
                        isFinished: true,
                    });
                } else {
                    throw new Error(output.data);
                }
            } catch (error) {
                const originalMessage = extractErrorMessage(error);
                const errorMessage = originalMessage
                    ? `Password reset failed: ${originalMessage}`
                    : 'Password reset failed.';

                updateState({
                    errorMessage,
                });
            } finally {
                updateState({
                    isLoading: false,
                });
            }
        }

        if (state.isFinished) {
            return html`
                <p class="success">Password reset.</p>
                <${AppSignIn.assign(inputs.frontendState)}></${AppSignIn}>
            `;
        } else {
            return html`
                <p>Please enter your new password:</p>

                <${AppCredentials.assign({
                    emailInput: undefined,
                    passwordInput: state.passwordInput,
                    errors: {
                        generic: state.errorMessage,
                    },
                    infoLines: [
                        createPasswordLengthInfo(inputs.frontendState.config),
                    ],
                    isCreatingAccount: true,
                    isLoading: state.isLoading,
                    submitButtonText: 'Submit New Password',
                })}
                    ${listen(AppCredentials.events.submit, async () => {
                        await submitNewPassword();
                    })}
                    ${listen(AppCredentials.events.credentialsUpdate, (event) => {
                        updateState({
                            passwordInput: event.detail.password,
                        });
                    })}
                ></${AppCredentials}>
            `;
        }
    },
});
