import {
    combineErrorMessages,
    ensureError,
    extractErrorMessage,
    log,
    wrapInTry,
} from '@augment-vir/common';
import {
    frontendPathTree,
    passwordTooShortErrorMessage,
    preparePassword,
    type UniversalConfig,
} from '@evir/common';
import {handleAuthResponse} from 'auth-vir';
import {css, defineElement, html, listen} from 'element-vir';
import {isValidEmailAddress} from 'parse-email-address';
import {noNativeSpacing} from 'vira';
import {type FullyResolvedFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {AppTextButton} from '../common/app-text-button.element.js';
import {AppEmailSuccess, EmailSuccessType} from '../verify-code/app-email-success.element.js';
import {AppCredentials, type CredentialErrors} from './app-credentials.element.js';

export const knownAccountCreationErrors = {
    invalidEmail: 'Invalid email address.',
    passwordShort: passwordTooShortErrorMessage + '.',
};

export function createPasswordLengthInfo(config: Readonly<Pick<UniversalConfig, 'password'>>) {
    return `Your password must be at least ${config.password.minLength} characters.`;
}

export const AppCreateAccount = defineElement<
    Readonly<Pick<FullyResolvedFrontendState, 'api' | 'config'>>
>()({
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
            emailInput: '',
            passwordInput: '',

            isLoading: false,

            errors: undefined as undefined | Partial<CredentialErrors>,

            createdUser: undefined as undefined | {emailAddress: string},
        };
    },
    render({state, updateState, inputs, dispatch}) {
        async function submitCreateAccount() {
            try {
                const createUser = {
                    emailAddress: state.emailInput,
                    password: state.passwordInput,
                };

                updateState({
                    errors: undefined,
                    isLoading: true,
                });

                const preparedPassword = await preparePassword(createUser.password, inputs.config);

                if (!isValidEmailAddress(createUser.emailAddress)) {
                    updateState({
                        errors: {
                            ...state.errors,
                            email: preparedPassword.failureReason,
                        },
                    });
                }
                if (preparedPassword.failureReason) {
                    updateState({
                        errors: {
                            ...state.errors,
                            password: knownAccountCreationErrors.passwordShort,
                        },
                    });
                }

                if (state.errors) {
                    return;
                }

                const output = await inputs.api.endpoints['/sign-up'].fetch({
                    requestData: {
                        emailAddress: createUser.emailAddress,
                        password: createUser.password,
                    },
                });
                wrapInTry(() => handleAuthResponse(output.response));

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
                log.error(ensureError(error));

                updateState({
                    errors: {
                        ...state.errors,
                        generic: combineErrorMessages(
                            'Account creation failed.',
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

        if (state.createdUser) {
            return html`
                <${AppEmailSuccess.assign({
                    emailAddress: state.createdUser.emailAddress,
                    successType: EmailSuccessType.UserCreated,
                })}></${AppEmailSuccess}>
            `;
        } else {
            return html`
                <p>Create an account for ${inputs.config.companyProperName}:</p>
                <${AppCredentials.assign({
                    emailInput: state.emailInput,
                    passwordInput: state.passwordInput,
                    errors: state.errors,
                    infoLines: [
                        createPasswordLengthInfo(inputs.config),
                        html`
                            Already have an account?
                            <${AppTextButton}
                                ${listen('click', () => {
                                    dispatch(
                                        new ChangeRouteEvent({
                                            scrollToTop: true,
                                            paths: frontendPathTree.paths.children.app.fullPaths,
                                        }),
                                    );
                                })}
                            >
                                Sign in instead.
                            </${AppTextButton}>
                        `,
                    ],
                    isCreatingAccount: true,
                    isLoading: state.isLoading,
                    submitButtonText: 'Create Account',
                })}
                    ${listen(AppCredentials.events.submit, async () => {
                        await submitCreateAccount();
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
