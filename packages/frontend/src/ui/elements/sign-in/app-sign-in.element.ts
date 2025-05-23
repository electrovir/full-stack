import {combineErrorMessages, extractErrorMessage, log} from '@augment-vir/common';
import {frontendPathTree} from '@evir/common';
import {handleAuthResponse} from 'auth-vir';
import {css, defineElement, html, listen} from 'element-vir';
import {noNativeSpacing, ViraLink} from 'vira';
import {type FullyResolvedFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {UserEditEvent} from '../../events/user-edit.event.js';
import {AppEmailSuccess, EmailSuccessType} from '../verify-code/app-email-success.element.js';
import {AppCredentials} from './app-credentials.element.js';

export const AppSignIn = defineElement<
    Readonly<Pick<FullyResolvedFrontendState, 'api' | 'config' | 'router'>>
>()({
    tagName: 'app-sign-in',
    styles: css`
        :host,
        section {
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
                const output = await inputs.api.endpoints['/login'].fetch({
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
                    throw new Error('Credentials mismatch.');
                }
            } catch (error) {
                log.error(error);
                updateState({
                    errorMessage: combineErrorMessages(
                        'Failed to sign in.',
                        extractErrorMessage(error),
                    ),
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
                    successType: EmailSuccessType.UserCreated,
                })}></${AppEmailSuccess}>
            `;
        } else {
            return html`
                <p>Please sign-in to ${inputs.config.companyProperName}:</p>
                <${AppCredentials.assign({
                    emailInput: state.emailInput,
                    passwordInput: state.passwordInput,
                    errors: {
                        generic: state.errorMessage,
                    },
                    infoLines: [
                        html`
                            <${ViraLink.assign({
                                route: {
                                    router: inputs.router,
                                    route: {
                                        paths: frontendPathTree.paths.children['reset-password']
                                            .fullPaths,
                                    },
                                },
                            })}>
                                Forgot your password?
                            </${ViraLink}>
                        `,
                        html`
                            Don't have an account?
                            <${ViraLink.assign({
                                route: {
                                    router: inputs.router,
                                    route: {
                                        paths: frontendPathTree.paths.children['create-account']
                                            .fullPaths,
                                    },
                                },
                            })}>
                                Create a new one.
                            </${ViraLink}>
                        `,
                    ],
                    isCreatingAccount: true,
                    isLoading: state.isLoading,
                    submitButtonText: 'Sign in',
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
