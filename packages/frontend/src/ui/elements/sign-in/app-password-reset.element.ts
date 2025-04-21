import {extractErrorMessage} from '@augment-vir/common';
import {type EmailCodeType} from '@evir/common';
import {css, defineElement, html, listen, renderIf} from 'element-vir';
import {LoaderAnimated24Icon, noNativeSpacing, ViraButton, ViraInput, ViraInputType} from 'vira';
import {type FullyResolvedFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {listenToEnter} from '../../directives/listen-to-enter.js';
import {appCssVars} from '../../styles/css-vars.js';
import {errorCss} from '../../styles/styles.js';
import {AppSignIn} from './app-sign-in.element.js';

export const AppPasswordReset = defineElement<
    Readonly<{
        code: string;
        codeType: EmailCodeType;
        codeId: string;
    }> &
        Readonly<Pick<FullyResolvedFrontendState, 'api' | 'config' | 'debug'>>
>()({
    tagName: 'app-password-reset',
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

        .error {
            ${errorCss};
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
            if (!inputs.code || !inputs.codeId || !state.passwordInput) {
                return;
            }

            updateState({
                errorMessage: '',
                isLoading: true,
            });
            try {
                const output = await inputs.api.endpoints['/verify'].fetch({
                    requestData: {
                        code: inputs.code,
                        codeType: inputs.codeType,
                        id: inputs.codeId,
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
                <p class="success">Password reset. Please sign in:</p>
                <${AppSignIn.assign({
                    ...inputs,
                    showButtons: {signInOnly: true},
                    hideSignInFailureLinks: true,
                })}></${AppSignIn}>
            `;
        }

        return html`
            <p>Please enter your new password:</p>
            <${ViraInput.assign({
                value: state.passwordInput,
                type: ViraInputType.Password,
                disabled: state.isLoading,
            })}
                ${listen(ViraInput.events.valueChange, (event) => {
                    updateState({
                        passwordInput: event.detail,
                    });
                })}
                ${listenToEnter(submitNewPassword)}
            ></${ViraInput}>
            ${renderIf(
                !!state.errorMessage,
                html`
                    <p class="error">${state.errorMessage}</p>
                `,
            )}
            <${ViraButton.assign({
                text: 'Submit',
                disabled: state.isLoading,
                icon: state.isLoading ? LoaderAnimated24Icon : undefined,
            })}
                ${listen('click', async () => {
                    await submitNewPassword();
                })}
            ></${ViraButton}>
        `;
    },
});
