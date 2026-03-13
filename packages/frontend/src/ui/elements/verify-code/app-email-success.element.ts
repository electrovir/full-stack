import {combineErrorMessages} from '@augment-vir/common';
import {convertDuration} from 'date-vir';
import {css, html, listen, nothing} from 'element-vir';
import {type RequireAtLeastOne} from 'type-fest';
import {LoaderAnimated24Icon, noNativeSpacing, ViraButton, ViraError} from 'vira';
import {
    EmailSuccessType,
    emailSuccessTypeToEmailCodeType,
} from '../../../data/email-success-type.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appColors} from '../../styles/color-theme.js';
import {appFont} from '../../styles/font.js';
import {AppPage} from '../common/app-page.element.js';
import {defineAppElement} from '../common/define-app-element.js';

enum ResendState {
    Loading = 'loading',
    Success = 'success',
}

export const AppEmailSuccess = defineAppElement<{
    emailAddress: string;
    successType: EmailSuccessType;
    frontendState: Readonly<FrontendState>;
    /**
     * Set to `true` if the email was just now (or _very recently_) sent to the user. If it was sent
     * a while in the past, set this to `false`.
     */
    emailSentJustNow: boolean;
}>()({
    tagName: 'app-email-success',
    styles: css`
        ${AppPage} {
            display: flex;
            flex-direction: column;
            gap: 16px;
            text-align: center;
        }

        p {
            ${noNativeSpacing}
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .link-success {
            color: ${appColors.colors['app-brand-primary'].foreground.value};
            font-weight: bold;
        }

        .title {
            color: ${appColors.colors['app-brand-primary'].foreground.value};
            ${appFont.largeBody}
        }
    `,
    state({inputs}) {
        return {
            resendState: undefined as undefined | ResendState,
            errorMessage: '',
            resendInterval: undefined as undefined | ReturnType<typeof globalThis.setInterval>,
            secondsTillResend: convertDuration(
                inputs.frontendState.frontendEnvClient.universalConfig.emailCodeDuration[
                    emailSuccessTypeToEmailCodeType[inputs.successType]
                ].overlap,
                {
                    seconds: true,
                },
            ).seconds,
        };
    },
    init({state, updateState}) {
        globalThis.clearInterval(state.resendInterval);
        updateState({
            resendInterval: globalThis.setInterval(() => {
                if (state.secondsTillResend <= 0) {
                    globalThis.clearInterval(state.resendInterval);
                    updateState({
                        resendInterval: undefined,
                    });
                }

                updateState({
                    secondsTillResend: state.secondsTillResend - 1,
                });
            }, 1000),
        });
    },
    cleanup({state, updateState}) {
        globalThis.clearInterval(state.resendInterval);
        updateState({
            resendInterval: undefined,
        });
    },
    render({inputs, state, updateState}) {
        const emailSuccessMessages: Record<
            EmailSuccessType,
            RequireAtLeastOne<{title: string; subtitle: string}>
        > = {
            [EmailSuccessType.AccountCreated]: {
                title: inputs.emailSentJustNow
                    ? inputs.frontendState.i18nClient.get.AppEmailSuccess.accountCreatedTitle
                    : inputs.frontendState.i18nClient.get.AppEmailSuccess.pleaseVerifyYourAccount,
                subtitle: inputs.emailSentJustNow
                    ? inputs.frontendState.i18nClient.get.AppEmailSuccess.accountCreatedSubtitle
                    : inputs.frontendState.i18nClient.get.AppEmailSuccess
                          .accountCreatedEmailSentSubtitle,
            },
            [EmailSuccessType.ForgotPassword]: {
                subtitle:
                    inputs.frontendState.i18nClient.get.AppEmailSuccess.forgotPasswordSubtitle,
            },
            [EmailSuccessType.PasswordReset]: {
                title: inputs.frontendState.i18nClient.get.AppEmailSuccess.passwordResetTitle,
                subtitle: inputs.frontendState.i18nClient.get.AppEmailSuccess.passwordResetSubtitle,
            },
        };

        const message = emailSuccessMessages[inputs.successType];

        const titleTemplate = message.title
            ? html`
                  <p class="title">${message.title}</p>
              `
            : nothing;

        const subtitle =
            message.subtitle ||
            inputs.frontendState.i18nClient.get.AppEmailSuccess.youWillReceiveALink;

        const canResend = state.secondsTillResend <= 0;

        const resendLinkTemplate =
            state.resendState === ResendState.Success
                ? html`
                      <p class="link-success">
                          ${inputs.frontendState.i18nClient.get.AppEmailSuccess
                              .linkSuccessfullyResent}
                      </p>
                  `
                : state.errorMessage
                  ? html`
                        <${ViraError}>${state.errorMessage}</${ViraError}>
                    `
                  : inputs.frontendState.user instanceof Promise ||
                      inputs.frontendState.user instanceof Error ||
                      inputs.frontendState.user == undefined
                    ? nothing
                    : html`
                          <${ViraButton.assign({
                              text: canResend
                                  ? inputs.frontendState.i18nClient.get.AppEmailSuccess
                                        .sendEmailAgainButtonText
                                  : `${inputs.frontendState.i18nClient.get.AppEmailSuccess.resendIn} ${state.secondsTillResend}`,
                              isDisabled: !!state.resendState || !canResend,
                              icon:
                                  state.resendState === ResendState.Loading
                                      ? LoaderAnimated24Icon
                                      : undefined,
                          })}
                              ${listen('click', async () => {
                                  updateState({
                                      resendState: ResendState.Loading,
                                  });

                                  try {
                                      const {data, ok} =
                                          await inputs.frontendState.apiClient.endpoints[
                                              '/resend-link'
                                          ].fetch({
                                              requestData: {
                                                  codeType:
                                                      emailSuccessTypeToEmailCodeType[
                                                          inputs.successType
                                                      ],
                                              },
                                          });

                                      if (ok) {
                                          updateState({
                                              resendState: ResendState.Success,
                                          });
                                      } else {
                                          throw new Error(data);
                                      }
                                  } catch (error) {
                                      updateState({
                                          errorMessage: combineErrorMessages(
                                              inputs.frontendState.i18nClient.get.AppEmailSuccess
                                                  .failedToResend,
                                              error,
                                          ),
                                          resendState: undefined,
                                      });
                                  }
                              })}
                          ></${ViraButton}>
                      `;

        return html`
            <${AppPage}>
                ${titleTemplate}
                <p>
                    ${subtitle}
                    <b>${inputs.emailAddress}</b>
                </p>
                ${resendLinkTemplate}
            </${AppPage}>
        `;
    },
});
