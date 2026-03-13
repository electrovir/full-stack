import {classMap, css, html, listen, nothing, testId} from 'element-vir';
import {type RequireExactlyOne} from 'type-fest';
import {
    LoaderAnimated24Icon,
    StatusSuccess24Icon,
    ViraButton,
    ViraColorVariant,
    ViraEmphasis,
    ViraError,
    ViraInput,
} from 'vira';
import {type FrontendState} from '../../../../../data/frontend-state/frontend-state.js';
import {appColors} from '../../../../styles/color-theme.js';
import {defineAppElement} from '../../../common/define-app-element.js';
import {beginPasswordReset} from '../../../login/app-reset-password.element.js';

export const AppUserSignInSettings = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
}>()({
    tagName: 'app-user-sign-in-settings',
    testIds: ['resetPassword'],
    styles: css`
        table {
            border-collapse: collapse;
        }

        th {
            text-align: right;
            padding: 0;
            padding-right: 8px;
        }

        td {
            padding: 0 8px;
        }

        .message {
            color: ${appColors.colors['app-body-secondary'].foreground.value};
            overflow: visible;
            white-space: nowrap;
            position: absolute;
        }

        .message-size {
            padding-bottom: 8px;
        }

        .single-button {
            margin-left: 16px;
        }

        .email-input {
            width: 240px;
            max-width: 100%;
        }

        .password-stars {
            font-family: monospace;
        }
    `,
    state() {
        return {
            newEmail: undefined as string | undefined,
            passwordResetSent: undefined as
                | undefined
                | RequireExactlyOne<{success: true; failure: string}>,
            isSubmittingNewEmail: false,
            isStartingPasswordReset: false,
            emailUpdateError: '',
        };
    },
    render({inputs, state, updateState, testIds}) {
        const cancelButtonTemplate =
            state.newEmail == undefined
                ? nothing
                : html`
                      <${ViraButton.assign({
                          text: inputs.frontendState.i18nClient.get.AppUserSignInSettings
                              .cancelEditingButton,
                          colorVariant: ViraColorVariant.Neutral,
                          isDisabled: state.isSubmittingNewEmail,
                      })}
                          ${listen('click', () => {
                              updateState({
                                  newEmail: undefined,
                              });
                          })}
                      ></${ViraButton}>
                  `;

        const emailEntryTemplate = state.newEmail
            ? html`
                  <${ViraInput.assign({
                      value: state.newEmail || inputs.frontendState.user.emailAddress,
                      disabled: state.isSubmittingNewEmail,
                  })}
                      class="email-input"
                      ${listen(ViraInput.events.valueChange, (event) => {
                          updateState({
                              newEmail: event.detail,
                          });
                      })}
                  ></${ViraInput}>
              `
            : html`
                  <div class="email-input">${inputs.frontendState.user.emailAddress}</div>
              `;

        const emailChangeButtonTemplate = html`
            ${cancelButtonTemplate}
            <${ViraButton.assign({
                text:
                    state.newEmail == undefined
                        ? inputs.frontendState.i18nClient.get.AppUserSignInSettings
                              .enterEditModeButton
                        : inputs.frontendState.i18nClient.get.AppUserSignInSettings.saveEditButton,
                buttonEmphasis: state.newEmail == undefined ? ViraEmphasis.Subtle : undefined,
                isDisabled:
                    state.isSubmittingNewEmail ||
                    state.newEmail === inputs.frontendState.user.emailAddress,
                icon: state.isSubmittingNewEmail ? LoaderAnimated24Icon : undefined,
            })}
                class=${classMap({
                    'single-button': state.newEmail == undefined,
                })}
                ${listen('click', async () => {
                    if (state.newEmail == undefined) {
                        updateState({
                            newEmail: inputs.frontendState.user.emailAddress,
                        });
                    } else {
                        updateState({
                            isSubmittingNewEmail: true,
                            emailUpdateError: '',
                        });
                        try {
                            const output = await inputs.frontendState.apiClient.endpoints[
                                '/update-email-address'
                            ].fetch({
                                requestData: {
                                    newEmailAddress: state.newEmail,
                                },
                            });

                            if (output.ok) {
                                updateState({
                                    newEmail: undefined,
                                });
                            } else {
                                updateState({
                                    emailUpdateError:
                                        output.data ||
                                        inputs.frontendState.i18nClient.get.AppUserSignInSettings
                                            .failedToSaveEmail,
                                });
                            }
                        } finally {
                            updateState({
                                isSubmittingNewEmail: false,
                            });
                        }
                    }
                })}
            ></${ViraButton}>
        `;

        const emailMessageTemplate = state.emailUpdateError
            ? html`
                  <div class="message">
                      <${ViraError}>${state.emailUpdateError}</${ViraError}>
                  </div>
                  <div class="message-size">&nbsp;</div>
              `
            : html`
                  <div class="message-size">&nbsp;</div>
              `;

        const passwordChangeButtonTemplate = html`
            <${ViraButton.assign({
                text: state.passwordResetSent?.success
                    ? ''
                    : inputs.frontendState.i18nClient.get.AppUserSignInSettings
                          .sendPasswordChangeEmail,
                colorVariant: ViraColorVariant.Neutral,
                isDisabled: state.passwordResetSent?.success,
                icon: state.passwordResetSent?.success ? StatusSuccess24Icon : undefined,
            })}
                ${testId(testIds.resetPassword)}
                class="single-button"
                ${listen('click', async () => {
                    try {
                        updateState({
                            isStartingPasswordReset: true,
                        });
                        const result = await beginPasswordReset(
                            inputs.frontendState,
                            inputs.frontendState.user.emailAddress,
                        );

                        if (result.success) {
                            updateState({
                                passwordResetSent: {
                                    success: true,
                                },
                            });
                        } else {
                            updateState({
                                passwordResetSent: {
                                    failure:
                                        result.failure.email || result.failure.generic || 'ERROR',
                                },
                            });
                        }
                    } finally {
                        updateState({
                            isStartingPasswordReset: false,
                        });
                    }
                })}
            ></${ViraButton}>
        `;

        const passwordMessageTemplate = state.passwordResetSent?.failure
            ? html`
                  <div class="message">
                      <${ViraError}>${state.passwordResetSent.failure}</${ViraError}>
                  </div>
                  <div class="message-size">&nbsp;</div>
              `
            : state.passwordResetSent?.success
              ? html`
                    <div class="message">
                        ${inputs.frontendState.i18nClient.get.AppUserSignInSettings
                            .passwordChangeEmailed}
                    </div>
                    <div class="message-size">&nbsp;</div>
                `
              : html`
                    <div class="message-size">&nbsp;</div>
                `;

        return html`
            <table
                aria-label=${inputs.frontendState.i18nClient.get.AppUserSignInSettings
                    .signInSettingsInfoTableAriaLabel}
                cellspacing="0"
                cellpadding="0"
            >
                <tbody>
                    <tr>
                        <th>
                            ${inputs.frontendState.i18nClient.get.AppUserSignInSettings.emailHeader}
                        </th>
                        <td>${emailEntryTemplate}</td>
                        <td>${emailChangeButtonTemplate}</td>
                    </tr>
                    <tr>
                        <th></th>
                        <td>${emailMessageTemplate}</td>
                        <td></td>
                    </tr>
                    <tr>
                        <th>
                            ${inputs.frontendState.i18nClient.get.AppUserSignInSettings
                                .passwordHeader}
                        </th>
                        <td>
                            <div class="password-stars">*****</div>
                        </td>
                        <td>${passwordChangeButtonTemplate}</td>
                    </tr>
                    <tr>
                        <th></th>
                        <td>${passwordMessageTemplate}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        `;
    },
});
