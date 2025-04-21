import {css, defineElement, html, listen, nothing} from 'element-vir';
import {noNativeSpacing} from 'vira';
import {type FullyResolvedFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {errorCss} from '../../styles/styles.js';
import {AppEmailSuccess, EmailSuccessType} from './app-email-success.element.js';
import {AppSignIn} from './app-sign-in.element.js';

/** This element contains both sign in and sign up functionality. */
export const AppSignUp = defineElement<
    Readonly<Pick<FullyResolvedFrontendState, 'api' | 'debug' | 'config'>>
>()({
    tagName: 'app-sign-up',
    styles: css`
        :host {
            display: flex;
            max-width: 100%;
            flex-direction: column;
            gap: 16px;
            width: 700px;
        }

        h2,
        p {
            ${noNativeSpacing};
        }

        p {
            text-align: center;
        }

        .error {
            ${errorCss}
        }
    `,
    state() {
        return {
            createdUser: undefined as undefined | {emailAddress: string; password: string},
            errorMessage: '',
            isCreatingUser: false,
            verificationEmailSent: undefined as undefined | {emailAddress: string},
            passwordReset: undefined as undefined | {emailAddress: string},
        };
    },
    render({state, updateState, inputs}) {
        if (state.createdUser) {
            return html`
                <${AppEmailSuccess.assign({
                    emailAddress: state.createdUser.emailAddress || '',
                    successType: EmailSuccessType.UserCreated,
                })}></${AppEmailSuccess}>
            `;
        } else if (state.verificationEmailSent) {
            return html`
                <${AppEmailSuccess.assign({
                    emailAddress: state.verificationEmailSent.emailAddress,
                    successType: EmailSuccessType.NewEmailVerification,
                })}></${AppEmailSuccess}>
            `;
        } else if (state.passwordReset) {
            return html`
                <${AppEmailSuccess.assign({
                    emailAddress: state.passwordReset.emailAddress,
                    successType: EmailSuccessType.PasswordReset,
                })}></${AppEmailSuccess}>
            `;
        }

        return html`
            <p>Please sign in or create an account:</p>
            <${AppSignIn.assign({
                showButtons: !state.createdUser,
                ...inputs,
            })}
                ${listen(AppSignIn.events.createUser, (event) => {
                    updateState({
                        createdUser: event.detail,
                    });
                })}
                ${listen(AppSignIn.events.passwordResetEmailSend, (event) => {
                    updateState({
                        passwordReset: event.detail,
                    });
                })}
                ${listen(AppSignIn.events.verificationEmailSend, (event) => {
                    updateState({
                        verificationEmailSent: event.detail,
                    });
                })}
            ></${AppSignIn}>
            ${state.errorMessage
                ? html`
                      <p class="error">${state.errorMessage}</p>
                  `
                : nothing}
        `;
    },
});
