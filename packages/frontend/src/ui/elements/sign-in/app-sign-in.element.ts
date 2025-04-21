import {check} from '@augment-vir/assert';
import {extractErrorMessage, log} from '@augment-vir/common';
import {frontendPathTree, preparePassword} from '@evir/common';
import {handleAuthResponse} from 'auth-vir';
import {css, defineElement, defineElementEvent, html, listen, nothing, renderIf} from 'element-vir';
import {isValidEmailAddress} from 'parse-email-address';
import {
    LoaderAnimated24Icon,
    noNativeFormStyles,
    noNativeSpacing,
    ViraButton,
    ViraButtonStyle,
    ViraInput,
    ViraInputType,
} from 'vira';
import {type FullyResolvedFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {listenToEnter} from '../../directives/listen-to-enter.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {UserEditEvent} from '../../events/user-edit.event.js';
import {AppEmailSuccess, EmailSuccessType} from './app-email-success.element.js';

/**
 * This is specifically (and only) the "Email" and "Password" entry and button portions of the sign
 * in / sign up process.
 */
export const AppSignIn = defineElement<
    {
        showButtons: true | {signInOnly: true} | false;
        hideSignInFailureLinks?: boolean | undefined;
    } & Readonly<Pick<FullyResolvedFrontendState, 'api' | 'config' | 'debug'>>
>()({
    tagName: 'app-sign-in',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: center;
            container-type: inline-size;
        }

        p {
            ${noNativeSpacing};
        }

        .error {
            color: red;
            font-weight: bold;
        }

        .form-position-wrapper {
            display: flex;
            flex-direction: column;
            align-self: stretch;
            gap: 8px;
            align-items: center;
        }

        .login-form {
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-width: 100%;
        }

        .small {
            opacity: 0.7;
            font-size: 12px;
            text-align: right;
            color: red;
        }

        .row {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 16px;
            max-width: 100%;
        }

        ${ViraInput} {
            max-width: 100%;
        }

        .row p {
            font-weight: bold;
            flex-basis: 100px;
            text-align: right;
        }

        .buttons {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .sign-in-error {
            text-align: center;
            margin-bottom: 12px;
        }

        .reset-prompt {
            ${noNativeFormStyles};
            text-decoration: underline;
            cursor: pointer;
        }

        @container (max-width: 300px) {
            .row {
                flex-direction: column;
                justify-content: flex-start;
                align-items: flex-start;
                gap: 2px;
            }

            .row p {
                flex-basis: unset;
                text-align: left;
            }
        }
    `,
    events: {
        /** Emitted when "Create User" is clicked. */
        createUser: defineElementEvent<{
            emailAddress: string;
            password: string;
        }>(),
        verificationEmailSend: defineElementEvent<{emailAddress: string}>(),
        passwordResetEmailSend: defineElementEvent<{emailAddress: string}>(),
    },
    state() {
        return {
            passwordResetSent: false,

            emailInput: '',
            passwordInput: '',

            signInErrorMessage: '',
            createUserErrorMessage: '',

            loadingState: undefined as undefined | SignInLoadingState,

            passwordInputHasBeenBlurred: false,
        };
    },
    render({state, updateState, dispatch, events, inputs}) {
        const submitEnabled = state.emailInput && state.passwordInput && !state.loadingState;

        async function submitLogin() {
            const emailInput = state.emailInput;

            if (!submitEnabled || !emailInput) {
                return;
            }
            updateState({
                loadingState: SignInLoadingState.SigningIn,
                signInErrorMessage: '',
                createUserErrorMessage: '',
            });

            try {
                const output = await inputs.api.endpoints['/login'].fetch({
                    requestData: {
                        emailAddress: emailInput,
                        password: state.passwordInput,
                    },
                    options: {
                        credentials: 'include',
                    },
                });
                if (output.ok) {
                    if ('emailSent' in output.data) {
                        dispatch(
                            new events.verificationEmailSend({
                                emailAddress: emailInput,
                            }),
                        );
                    } else {
                        handleAuthResponse(output.response);
                        dispatch(new UserEditEvent(output.data));
                        dispatch(
                            new ChangeRouteEvent({
                                scrollToTop: true,
                                paths: frontendPathTree.paths.children.app.fullPaths,
                                replace: true,
                            }),
                        );
                    }
                } else {
                    const errorMessage = output.data ? `: ${output.data}.` : '.';

                    updateState({
                        signInErrorMessage: `Credentials mismatch${errorMessage}`,
                    });
                }
            } catch (error) {
                log.error(error);
                updateState({
                    signInErrorMessage: 'Credentials mismatch.',
                });
            } finally {
                updateState({
                    loadingState: undefined,
                });
            }
        }

        if (state.passwordResetSent) {
            return html`
                <${AppEmailSuccess.assign({
                    emailAddress: state.emailInput,
                    successType: EmailSuccessType.PasswordReset,
                })}></${AppEmailSuccess}>
            `;
        }

        return html`
            <div class="form-position-wrapper">
                <div class="login-form">
                    <div class="row">
                        <p>Email:</p>
                        <${ViraInput.assign({
                            value: state.emailInput,
                            type: ViraInputType.Email,
                            disabled: !!state.loadingState,
                        })}
                            ${listen(ViraInput.events.valueChange, (event) => {
                                updateState({
                                    emailInput: event.detail,
                                    signInErrorMessage: '',
                                    createUserErrorMessage: '',
                                });
                            })}
                            ${listenToEnter(submitLogin)}
                        ></${ViraInput}>
                    </div>
                    <div class="row">
                        <p>Password:</p>
                        <${ViraInput.assign({
                            value: state.passwordInput,
                            type: ViraInputType.Password,
                            disabled: !!state.loadingState,
                        })}
                            ${listen(ViraInput.events.valueChange, (event) => {
                                updateState({
                                    passwordInput: event.detail,
                                });
                            })}
                            ${listen('blur', () => {
                                updateState({
                                    passwordInputHasBeenBlurred: true,
                                });
                            })}
                            ${listenToEnter(submitLogin)}
                        ></${ViraInput}>
                    </div>
                </div>
            </div>
            ${state.signInErrorMessage
                ? html`
                      <p class="sign-in-error">
                          <span class="error">${state.signInErrorMessage}</span>
                          ${renderIf(
                              !inputs.hideSignInFailureLinks,
                              html`
                                  <br />
                                  New to App?
                                  <button
                                      class="reset-prompt"
                                      ${listen('click', () => {
                                          if (!submitEnabled) {
                                              return;
                                          }

                                          updateState({
                                              signInErrorMessage: '',
                                              createUserErrorMessage: '',
                                          });
                                          dispatch(
                                              new events.createUser({
                                                  emailAddress: state.emailInput,
                                                  password: state.passwordInput,
                                              }),
                                          );
                                      })}
                                  >
                                      Click here to create a new account.
                                  </button>
                                  <br />
                                  <br />
                                  If necessary,
                                  <button
                                      class="reset-prompt"
                                      ${listen('click', async () => {
                                          const emailInput = state.emailInput;
                                          if (!emailInput) {
                                              return;
                                          }
                                          updateState({
                                              loadingState: SignInLoadingState.SigningIn,
                                          });

                                          const output = await inputs.api.endpoints[
                                              '/reset-password'
                                          ].fetch({
                                              requestData: {
                                                  emailAddress: emailInput,
                                              },
                                          });

                                          if (output.ok) {
                                              updateState({
                                                  loadingState: undefined,
                                                  passwordResetSent: true,
                                              });
                                              dispatch(
                                                  new events.passwordResetEmailSend({
                                                      emailAddress: emailInput,
                                                  }),
                                              );
                                          } else {
                                              updateState({
                                                  loadingState: undefined,
                                                  createUserErrorMessage: extractErrorMessage(
                                                      output.data,
                                                  ),
                                              });
                                          }
                                      })}
                                  >
                                      click here to reset your password.
                                  </button>
                              `,
                          )}
                      </p>
                  `
                : state.createUserErrorMessage
                  ? html`
                        <p class="error">${state.createUserErrorMessage}</p>
                    `
                  : nothing}
            ${renderIf(
                !!inputs.showButtons,
                html`
                    <div class="buttons">
                        ${renderIf(
                            !check.hasKey(inputs.showButtons, 'signInOnly'),
                            html`
                                <${ViraButton.assign({
                                    text: 'Create Account',
                                    buttonStyle: ViraButtonStyle.Outline,
                                    disabled: !submitEnabled,
                                    icon:
                                        state.loadingState === SignInLoadingState.CreatingUser
                                            ? LoaderAnimated24Icon
                                            : undefined,
                                })}
                                    ${listen('click', async () => {
                                        try {
                                            if (!submitEnabled) {
                                                return;
                                            }
                                            const createUser = {
                                                emailAddress: state.emailInput,
                                                password: state.passwordInput,
                                            };

                                            updateState({
                                                signInErrorMessage: '',
                                                createUserErrorMessage: '',
                                                loadingState: SignInLoadingState.CreatingUser,
                                            });

                                            const preparedPassword = await preparePassword(
                                                createUser.password,
                                                inputs.config,
                                            );

                                            if (!isValidEmailAddress(createUser.emailAddress)) {
                                                updateState({
                                                    createUserErrorMessage:
                                                        'Invalid email address.',
                                                });
                                                return;
                                            } else if (preparedPassword.failureReason) {
                                                updateState({
                                                    createUserErrorMessage:
                                                        preparedPassword.failureReason + '.',
                                                });
                                                return;
                                            }

                                            updateState({
                                                createUserErrorMessage: '',
                                            });

                                            const output = await inputs.api.endpoints[
                                                '/sign-up'
                                            ].fetch({
                                                requestData: {
                                                    emailAddress: createUser.emailAddress,
                                                    password: createUser.password,
                                                },
                                            });

                                            if (inputs.debug) {
                                                console.info('Sign up output:', output);
                                            }

                                            if (output.ok) {
                                                dispatch(new events.createUser(createUser));
                                            } else {
                                                throw new Error(output.data);
                                            }
                                        } catch (error) {
                                            const errorMessage = extractErrorMessage(error);
                                            log.error(errorMessage);

                                            updateState({
                                                createUserErrorMessage:
                                                    errorMessage || 'Sign up failed.',
                                            });
                                        } finally {
                                            updateState({
                                                loadingState: undefined,
                                            });
                                        }
                                    })}
                                ></${ViraButton}>
                            `,
                        )}
                        <${ViraButton.assign({
                            text: 'Sign In',
                            disabled: !submitEnabled,
                            icon:
                                state.loadingState === SignInLoadingState.SigningIn
                                    ? LoaderAnimated24Icon
                                    : undefined,
                        })}
                            ${listen('click', submitLogin)}
                        ></${ViraButton}>
                    </div>
                `,
            )}
        `;
    },
});

enum SignInLoadingState {
    SigningIn = 'signing-in',
    CreatingUser = 'creating-user',
}
