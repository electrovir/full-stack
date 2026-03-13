import {check} from '@augment-vir/assert';
import {combineErrorMessages, log} from '@augment-vir/common';
import {csrfOptions, frontendPathTree} from '@evir/common';
import {handleAuthResponse} from 'auth-vir';
import {css, html, listen} from 'element-vir';
import {noNativeSpacing, ViraLink} from 'vira';
import {EmailSuccessType} from '../../../data/email-success-type.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {UserEditEvent} from '../../events/user-edit.event.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppEmailSuccess} from '../verify-code/app-email-success.element.js';
import {AppCredentials} from './app-credentials.element.js';

export const AppSignIn = defineAppElement<{
    wipeUrlAfterLogin: boolean;
    frontendState: Readonly<FrontendState<void, false>>;
}>()({
    tagName: 'app-sign-in',
    styles: css`
        :host,
        section {
            display: flex;
            width: 356px;
            max-width: 100%;
            flex-direction: column;
            gap: 32px;
            align-items: center;
        }

        p {
            ${noNativeSpacing};
        }

        ${AppCredentials} {
            align-self: stretch;
        }
    `,
    state() {
        return {
            emailInput: '',
            passwordInput: '',

            isLoading: false,

            errorMessage: '',

            stillNeedsVerification: undefined as undefined | {emailAddress: string},
        };
    },
    render({state, updateState, inputs, dispatch}) {
        async function submitSignIn() {
            const userInput = {
                emailAddress: state.emailInput,
                password: state.passwordInput,
            };

            updateState({
                isLoading: true,
                errorMessage: '',
            });

            try {
                const output = await inputs.frontendState.apiClient.endpoints['/login'].fetch({
                    requestData: {
                        emailAddress: userInput.emailAddress,
                        password: userInput.password,
                    },
                    options: {
                        credentials: 'include',
                    },
                });
                if (output.ok) {
                    if ('emailSent' in output.data) {
                        updateState({
                            stillNeedsVerification: {
                                emailAddress: userInput.emailAddress,
                            },
                        });
                    } else {
                        handleAuthResponse(output.response, csrfOptions);
                        dispatch(new UserEditEvent(output.data));
                        if (inputs.wipeUrlAfterLogin) {
                            dispatch(
                                new ChangeRouteEvent({
                                    paths: [],
                                }),
                            );
                        }
                    }
                } else {
                    throw new Error(
                        inputs.frontendState.i18nClient.get.AppSignIn.credentialsMismatch,
                    );
                }
            } catch (error) {
                log.error(error);
                updateState({
                    errorMessage: combineErrorMessages(
                        inputs.frontendState.i18nClient.get.AppSignIn.failedToSignIn,
                        error,
                    ),
                    passwordInput: '',
                });
            } finally {
                updateState({
                    isLoading: false,
                });
            }
        }

        if (state.stillNeedsVerification) {
            return html`
                <${AppEmailSuccess.assign({
                    emailAddress: state.stillNeedsVerification.emailAddress,
                    successType: EmailSuccessType.AccountCreated,
                    frontendState: inputs.frontendState,
                    emailSentJustNow: false,
                })}></${AppEmailSuccess}>
            `;
        } else {
            return html`
                <p>
                    ${inputs.frontendState.i18nClient.get.AppSignIn.pleaseSignIn({
                        appName:
                            inputs.frontendState.frontendEnvClient.universalConfig
                                .companyProperName,
                    })}
                </p>
                <${AppCredentials.assign({
                    frontendState: inputs.frontendState,
                    emailInput: state.emailInput,
                    passwordInput: state.passwordInput,
                    errors: {
                        generic: state.errorMessage,
                    },
                    infoLines: [
                        html`
                            <${ViraLink.assign({
                                route: {
                                    router: inputs.frontendState.router,
                                    route: {
                                        paths: frontendPathTree.paths.children['forgot-password']
                                            .fullPaths,
                                    },
                                },
                            })}>
                                ${inputs.frontendState.i18nClient.get.AppSignIn.forgotPassword}
                            </${ViraLink}>
                        `,
                        inputs.frontendState.frontendEnvClient.universalConfig
                            .selfServeSignupEnabled
                            ? html`
                                  ${inputs.frontendState.i18nClient.get.AppSignIn.noAccount}
                                  <${ViraLink.assign({
                                      route: {
                                          router: inputs.frontendState.router,
                                          route: {
                                              paths: frontendPathTree.paths.children[
                                                  'create-account'
                                              ].fullPaths,
                                          },
                                      },
                                  })}>
                                      ${inputs.frontendState.i18nClient.get.AppSignIn.createAccount}
                                  </${ViraLink}>
                              `
                            : undefined,
                    ].filter(check.isTruthy),
                    isCreatingAccount: true,
                    isLoading: state.isLoading,
                    submitButtonText: inputs.frontendState.i18nClient.get.AppSignIn.signInButton,
                })}
                    ${listen(AppCredentials.events.submit, async () => {
                        await submitSignIn();
                    })}
                    ${listen(AppCredentials.events.credentialsUpdate, (event) => {
                        updateState({
                            emailInput: event.detail.emailAddress,
                            passwordInput: event.detail.password,
                        });
                    })}
                ></${AppCredentials}>
            `;
        }
    },
});
