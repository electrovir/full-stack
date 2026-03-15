import {combineErrorMessages, ensureError, wrapInTry} from '@augment-vir/common';
import {csrfOptions, frontendPathTree, PasswordFailureReason, preparePassword} from '@evir/common';
import {handleAuthResponse} from 'auth-vir';
import {css, html, listen, nothing} from 'element-vir';
import {isValidEmailAddress} from 'parse-email-address';
import {handleError} from 'sentry-vir';
import {
    noNativeSpacing,
    type ViraFormField,
    type ViraFormFields,
    ViraFormFieldType,
    ViraLink,
} from 'vira';
import {EmailSuccessType} from '../../../data/email-success-type.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppEmailSuccess} from '../verify-code/app-email-success.element.js';
import {AppCredentials, type CredentialErrors} from './app-credentials.element.js';

export const AppCreateAccount = defineAppElement<{
    frontendState: FrontendState;
}>()({
    tagName: 'app-create-account',
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
            emailAddressInput: '',
            passwordInput: '',
            teamNameInput: '',
            humanNameInput: '',

            isLoading: false,

            errors: undefined as undefined | Partial<CredentialErrors>,

            createdUser: undefined as undefined | {emailAddress: string},
        };
    },
    render({state, dispatch, updateState, inputs}) {
        if (!inputs.frontendState.frontendEnvClient.universalConfig.selfServeSignupEnabled) {
            dispatch(
                new ChangeRouteEvent({
                    paths: [],
                    replace: true,
                }),
            );
            return nothing;
        }
        const isCreateAccountEnabled: boolean = [
            state.humanNameInput,
            state.emailAddressInput,
            state.passwordInput,
        ].every((inputValue) => !!inputValue.trim());

        async function submitCreateAccount() {
            try {
                if (!isCreateAccountEnabled) {
                    return;
                }

                const createUser = {
                    emailAddress: state.emailAddressInput,
                    password: state.passwordInput,
                };

                updateState({
                    errors: undefined,
                    isLoading: true,
                });

                const preparedPassword = await preparePassword(
                    createUser.password,
                    inputs.frontendState.frontendEnvClient.universalConfig,
                );

                if (!isValidEmailAddress(createUser.emailAddress)) {
                    updateState({
                        errors: {
                            ...state.errors,
                            email: inputs.frontendState.i18nClient.get.AppCreateAccount
                                .invalidEmailErrorMessage,
                        },
                    });
                }
                if (preparedPassword.failureReason) {
                    updateState({
                        errors: {
                            ...state.errors,
                            password:
                                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                                preparedPassword.failureReason === PasswordFailureReason.TooShort
                                    ? inputs.frontendState.i18nClient.get.AppCreateAccount
                                          .passwordTooShortErrorMessage
                                    : inputs.frontendState.i18nClient.get.AppCreateAccount
                                          .passwordFailed,
                        },
                    });
                }

                if (state.errors) {
                    return;
                }

                const output = await inputs.frontendState.apiClient.endpoints['/sign-up'].fetch({
                    requestData: {
                        emailAddress: createUser.emailAddress,
                        password: createUser.password,
                        info: {
                            humanName: state.humanNameInput,
                            teamName: state.teamNameInput,
                        },
                    },
                });
                await wrapInTry(() => handleAuthResponse(output.response, csrfOptions));

                if (output.ok) {
                    updateState({
                        createdUser: {
                            emailAddress: createUser.emailAddress,
                        },
                    });
                } else {
                    throw new Error(output.data);
                }
            } catch (error) {
                handleError(ensureError(error));

                updateState({
                    errors: {
                        ...state.errors,
                        generic: combineErrorMessages(
                            inputs.frontendState.i18nClient.get.AppCreateAccount
                                .accountCreationFailed,
                            error,
                        ),
                    },
                });
            } finally {
                updateState({
                    isLoading: false,
                });
            }
        }

        const extraFormFields: ViraFormFields = {
            humanNameInput: {
                type: ViraFormFieldType.Text,
                label: inputs.frontendState.i18nClient.get.AppCreateAccount.yourNameLabel,
                value: state.humanNameInput,
            },
            teamNameInput: {
                type: ViraFormFieldType.Text,
                label: inputs.frontendState.i18nClient.get.AppCreateAccount.companyName,
                value: state.teamNameInput,
            },
        } satisfies Partial<Record<keyof typeof state, ViraFormField>>;

        if (state.createdUser) {
            return html`
                <${AppEmailSuccess.assign({
                    frontendState: inputs.frontendState,
                    emailAddress: state.createdUser.emailAddress,
                    successType: EmailSuccessType.AccountCreated,
                    emailSentJustNow: true,
                })}></${AppEmailSuccess}>
            `;
        } else {
            return html`
                <p>${inputs.frontendState.i18nClient.get.AppCreateAccount.createAnAccountHeader}</p>
                <${AppCredentials.assign({
                    emailInput: state.emailAddressInput,
                    passwordInput: state.passwordInput,
                    errors: state.errors,
                    infoLines: [
                        inputs.frontendState.i18nClient.get.AppCreateAccount.passwordLengthRequirement(
                            {
                                length: inputs.frontendState.frontendEnvClient.universalConfig
                                    .password.minLength,
                            },
                        ),
                        html`
                            ${inputs.frontendState.i18nClient.get.AppCreateAccount
                                .alreadyHaveAccount}
                            <${ViraLink.assign({
                                route: {
                                    router: inputs.frontendState.router,
                                    route: {
                                        /**
                                         * If there is no user logged in, the default root path will
                                         * ask the user to sign in.
                                         */
                                        paths: frontendPathTree.paths.fullPaths,
                                    },
                                },
                            })}>
                                ${inputs.frontendState.i18nClient.get.AppCreateAccount
                                    .signInInstead}
                            </${ViraLink}>
                        `,
                    ],
                    submitDisabled: !isCreateAccountEnabled,
                    isCreatingAccount: true,
                    isLoading: state.isLoading,
                    submitButtonText:
                        inputs.frontendState.i18nClient.get.AppCreateAccount.createAccountButton,
                    extraFormFields,
                    frontendState: inputs.frontendState,
                })}
                    ${listen(AppCredentials.events.submit, async () => {
                        await submitCreateAccount();
                    })}
                    ${listen(AppCredentials.events.credentialsUpdate, (event) => {
                        updateState({
                            emailAddressInput: event.detail.emailAddress,
                            passwordInput: event.detail.password,
                        });
                    })}
                    ${listen(AppCredentials.events.extraFormFieldsUpdate, (event) => {
                        updateState(event.detail);
                    })}
                ></${AppCredentials}>
            `;
        }
    },
});
