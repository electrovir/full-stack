import {check} from '@augment-vir/assert';
import {type ArrayElement, extractErrorMessage, log} from '@augment-vir/common';
import {type EmailCode, EmailCodeType, preparePassword} from '@evir/common';
import {css, html, listen, nothing} from 'element-vir';
import {noNativeSpacing, type ViraFormFields, ViraFormFieldType} from 'vira';
import {type AppI18nClient} from '../../../data/frontend-state/frontend-clients/app-i18n.client.js';
import {stateMatches} from '../../../data/frontend-state/frontend-state-checks.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {UserEditEvent} from '../../events/user-edit.event.js';
import {appColors} from '../../styles/color-theme.js';
import {appCssVars} from '../../styles/css-vars.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppCredentials} from '../login/app-credentials.element.js';
import {AppSignIn} from '../login/app-sign-in.element.js';

const codeTypesAllowedForEnteringPassword = [
    EmailCodeType.PasswordReset,
    EmailCodeType.UserInvitation,
] as const satisfies EmailCodeType[];

function getPasswordResetPhrases({
    codeType,
    i18nClient,
}: Readonly<{
    i18nClient: Readonly<AppI18nClient>;
    codeType: ArrayElement<typeof codeTypesAllowedForEnteringPassword>;
}>) {
    const phrases = {
        [EmailCodeType.PasswordReset]: {
            submitButtonText: i18nClient.get.AppEnterResetPassword.submitNewPasswordButton,
            success: i18nClient.get.AppEnterResetPassword.successfulPasswordChange,
            enterPrompt: i18nClient.get.AppEnterResetPassword.enterNewPasswordHeader,
        },
        [EmailCodeType.UserInvitation]: {
            submitButtonText: i18nClient.get.AppEnterResetPassword.submitFirstPasswordButton,
            success: i18nClient.get.AppEnterResetPassword.successfulPasswordCreation,
            enterPrompt: i18nClient.get.AppEnterResetPassword.createFirstPasswordHeader,
        },
    };

    return phrases[codeType];
}

/** Used to enter a new password after the user has verified their password reset email code link. */
export const AppEnterResetPassword = defineAppElement<{
    emailCode: Readonly<{
        code: string;
        codeType: EmailCodeType;
        codeId: EmailCode['id'];
    }>;
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-enter-reset-password',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: ${appCssVars['app-content-padding'].value};
            align-items: center;
        }

        .success {
            color: ${appColors.colors['app-brand-primary'].foreground.value};
            font-size: 1.3em;
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
            humanNameInput: '',
            isLoading: false,
            errorMessage: '',
            isFinished: false,
        };
    },
    render({inputs, state, updateState, dispatch}) {
        if (!check.isIn(inputs.emailCode.codeType, codeTypesAllowedForEnteringPassword)) {
            log.error(`Invalid password setting code: ${inputs.emailCode.codeType}.`);
            dispatch(
                new ChangeRouteEvent({
                    paths: [],
                    replace: true,
                }),
            );
            return nothing;
        }

        const isInvitation = inputs.emailCode.codeType === EmailCodeType.UserInvitation;

        async function submitNewPassword() {
            updateState({
                errorMessage: '',
                isLoading: true,
            });
            try {
                const newPassword = state.passwordInput;

                const preparedPassword = await preparePassword(
                    newPassword,
                    inputs.frontendState.frontendEnvClient.universalConfig,
                );
                if (preparedPassword.failureReason) {
                    updateState({
                        errorMessage: preparedPassword.failureReason,
                    });
                    return;
                }

                const output = await inputs.frontendState.apiClient.endpoints['/verify'].fetch({
                    requestData: {
                        code: inputs.emailCode.code,
                        codeType: inputs.emailCode.codeType,
                        id: inputs.emailCode.codeId,
                        newPassword: state.passwordInput,
                        ...(isInvitation
                            ? {
                                  newHumanName: state.humanNameInput,
                              }
                            : {}),
                    },
                });

                if (output.ok) {
                    const {ok, data} =
                        await inputs.frontendState.apiClient.endpoints['/user'].fetch();

                    if (ok) {
                        dispatch(new UserEditEvent(data));
                    }

                    updateState({
                        isFinished: true,
                    });
                } else {
                    throw new Error(output.data);
                }
            } catch (error) {
                const originalMessage = extractErrorMessage(error);
                const errorMessage = originalMessage
                    ? inputs.frontendState.i18nClient.get.AppEnterResetPassword.passwordResetFailedWithMessage(
                          {
                              message: originalMessage,
                          },
                      )
                    : inputs.frontendState.i18nClient.get.AppEnterResetPassword
                          .passwordResetFailedGeneric;

                updateState({
                    errorMessage,
                });
            } finally {
                updateState({
                    isLoading: false,
                });
            }
        }

        const phrases = getPasswordResetPhrases({
            codeType: inputs.emailCode.codeType,
            i18nClient: inputs.frontendState.i18nClient,
        });

        if (state.isFinished) {
            return html`
                <p class="success">${phrases.success}</p>
                ${stateMatches(inputs.frontendState, {
                    hasUser: false,
                })
                    ? html`
                          <${AppSignIn.assign({
                              frontendState: inputs.frontendState,
                              wipeUrlAfterLogin: true,
                          })}></${AppSignIn}>
                      `
                    : nothing}
            `;
        } else {
            const extraFormFields: ViraFormFields = isInvitation
                ? {
                      humanNameInput: {
                          type: ViraFormFieldType.Text,
                          label: inputs.frontendState.i18nClient.get.AppEnterResetPassword
                              .yourNameLabel,
                          value: state.humanNameInput,
                      },
                  }
                : {};

            return html`
                <p>${phrases.enterPrompt}</p>

                <${AppCredentials.assign({
                    ...inputs,
                    emailInput: undefined,
                    passwordInput: state.passwordInput,
                    extraFormFields,
                    errors: {
                        generic: state.errorMessage,
                    },
                    infoLines: [
                        inputs.frontendState.i18nClient.get.AppCreateAccount.passwordLengthRequirement(
                            {
                                length: inputs.frontendState.frontendEnvClient.universalConfig
                                    .password.minLength,
                            },
                        ),
                    ],
                    isCreatingAccount: true,
                    isLoading: state.isLoading,
                    submitButtonText: phrases.submitButtonText,
                })}
                    ${listen(AppCredentials.events.submit, async () => {
                        await submitNewPassword();
                    })}
                    ${listen(AppCredentials.events.credentialsUpdate, (event) => {
                        updateState({
                            passwordInput: event.detail.password,
                            errorMessage: '',
                        });
                    })}
                    ${listen(AppCredentials.events.extraFormFieldsUpdate, (event) => {
                        updateState({
                            humanNameInput: String(event.detail.humanNameInput || ''),
                            errorMessage: '',
                        });
                    })}
                ></${AppCredentials}>
            `;
        }
    },
});
