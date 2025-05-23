import {check} from '@augment-vir/assert';
import {filterMap, type PartialWithUndefined} from '@augment-vir/common';
import {
    classMap,
    css,
    defineElement,
    defineElementEvent,
    html,
    type HTMLTemplateResult,
    keyed,
    listen,
    nothing,
} from 'element-vir';
import {LoaderAnimated24Icon, ViraButton, ViraInput, ViraInputType} from 'vira';
import {listenToEnter} from '../../directives/listen-to-enter.js';
import {appCssVars} from '../../styles/css-vars.js';
import {AppCard, AppCardState} from '../common/app-card.element.js';
import {AppError} from '../common/app-error.element.js';

/**
 * The number of pixels width under which {@link AppCredentials} will adjust it's layout to a more
 * vertical one.
 */
export const AppCredentialsWrapThreshold = 264;

export type CredentialErrors = PartialWithUndefined<{
    email: string;
    password: string;
    generic: string;
}>;

/**
 * This element automatically takes up its minimal space. You must externally set a width or
 * horizontal `flex-grow` on it to make it take up more space.
 */
export const AppCredentials = defineElement<{
    /**
     * Set to `undefined` to disable email input. Use an empty string (`''`) when a user hasn't
     * typed anything yet.
     */
    emailInput: string | undefined;
    /**
     * Set to `undefined` to disable password input. Use an empty string (`''`) when a user hasn't
     * typed anything yet.
     */
    passwordInput: string | undefined;

    /** Set to `undefined` to disable the submit button. */
    submitButtonText: string | undefined;

    isLoading: boolean;

    isCreatingAccount: boolean;
    infoLines: ReadonlyArray<string | HTMLTemplateResult>;
    errors: undefined | Readonly<CredentialErrors>;
}>()({
    tagName: 'app-credentials',
    state() {
        return {
            receivedUserInputSinceError: {
                email: false,
                password: false,
            },
        };
    },
    hostClasses: {
        'app-credentials-only-one-input': ({inputs}) =>
            inputs.emailInput == undefined || inputs.passwordInput == undefined,
    },
    styles: ({hostClasses}) => css`
        :host {
            display: flex;
            max-width: 100%;
            flex-direction: column;
            gap: 32px;
            align-items: center;
        }

        section {
            width: 100%;
            display: flex;
            align-self: stretch;
            max-width: 100%;
            flex-direction: column;
            gap: 32px;
            align-items: stretch;
            container-type: inline-size;
        }

        form {
            max-width: 100%;
            flex-grow: 1;
            display: flex;
            gap: 16px;
            flex-direction: column;
        }

        ${ViraInput} {
            width: 100%;
            max-width: 100%;
            flex-grow: 1;
        }

        ${ViraInput}.error {
            ${ViraInput.cssVars['vira-input-border-color'].name}: ${appCssVars[
                'error-foreground-color'
            ].value};
        }

        label {
            display: flex;
            align-items: center;
            gap: 16px;
        }

        ${ViraButton} {
            align-self: center;
        }

        .input-name {
            font-weight: bold;
            flex-basis: 100px;
            text-align: right;
            flex-shrink: 0;
            flex-wrap: wrap;
        }

        ${hostClasses['app-credentials-only-one-input'].selector} .input-name {
            flex-basis: unset;
        }

        ul {
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 8px;
            opacity: 0.7;
        }

        .error {
            color: ${appCssVars['error-foreground-color'].value};
        }

        li {
            list-style: none;
            text-align: center;
        }

        @container (max-width: ${AppCredentialsWrapThreshold}px) {
            label {
                flex-direction: column;
                justify-content: flex-start;
                align-items: flex-start;
                gap: 2px;
            }

            .input-name {
                flex-basis: unset;
                text-align: left;
            }
        }
    `,
    events: {
        credentialsUpdate: defineElementEvent<{
            emailAddress: string;
            password: string;
        }>(),
        submit: defineElementEvent<void>(),
    },
    render({inputs, dispatch, events, updateState, state}) {
        const errorRowTemplates = filterMap(
            Object.values(inputs.errors || {}),
            (errorMessage) => {
                if (!errorMessage) {
                    return undefined;
                }

                return html`
                    <li>${errorMessage}</li>
                `;
            },
            check.isTruthy,
        );

        const errorTemplate = errorRowTemplates.length
            ? html`
                  <${AppCard.assign({
                      state: AppCardState.Error,
                  })}>
                      <${AppError}>
                          <ul>
                              ${errorRowTemplates}
                          </ul>
                      </${AppError}>
                  </${AppCard}>
              `
            : nothing;

        const hasModifiedError =
            (inputs.errors?.generic
                ? state.receivedUserInputSinceError.email ||
                  state.receivedUserInputSinceError.password
                : true) &&
            (inputs.errors?.email ? state.receivedUserInputSinceError.email : true) &&
            (inputs.errors?.password ? state.receivedUserInputSinceError.password : true);
        const hasInputs =
            (inputs.emailInput == undefined ? true : !!inputs.emailInput) &&
            (inputs.passwordInput == undefined ? true : !!inputs.passwordInput);

        const isSubmitEnabled: boolean = hasInputs && !inputs.isLoading && hasModifiedError;

        const infoRowTemplates = inputs.infoLines.map((infoLine) => {
            return html`
                <li>${infoLine}</li>
            `;
        });

        const infoTemplate = infoRowTemplates.length
            ? html`
                  <${AppCard}>
                      <ul>
                          ${infoRowTemplates}
                      </ul>
                  </${AppCard}>
              `
            : nothing;

        const emailTemplate =
            inputs.emailInput == undefined
                ? nothing
                : html`
                      <label>
                          <span class="input-name">Email:</span>
                          <${ViraInput.assign({
                              value: inputs.emailInput,
                              type: ViraInputType.Email,
                              disabled: inputs.isLoading,
                              attributePassthrough: {
                                  autocomplete: 'username',
                                  autofocus: true,
                              },
                          })}
                              class=${classMap({
                                  error:
                                      !state.receivedUserInputSinceError.email &&
                                      !!inputs.errors?.email,
                              })}
                              ${listen(ViraInput.events.valueChange, (event) => {
                                  dispatch(
                                      new events.credentialsUpdate({
                                          emailAddress: event.detail,
                                          password: inputs.passwordInput || '',
                                      }),
                                  );
                                  updateState({
                                      receivedUserInputSinceError: {
                                          ...state.receivedUserInputSinceError,
                                          email: true,
                                      },
                                  });
                              })}
                          ></${ViraInput}>
                      </label>
                  `;

        const passwordTemplate =
            inputs.passwordInput == undefined
                ? nothing
                : html`
                      <label>
                          <span class="input-name">Password:</span>
                          <${ViraInput.assign({
                              value: inputs.passwordInput,
                              type: ViraInputType.Password,
                              disabled: inputs.isLoading,
                              attributePassthrough: {
                                  autocomplete: inputs.isCreatingAccount
                                      ? 'new-password'
                                      : 'current-password',
                              },
                          })}
                              class=${classMap({
                                  error:
                                      !state.receivedUserInputSinceError.password &&
                                      !!inputs.errors?.password,
                              })}
                              ${listen(ViraInput.events.valueChange, (event) => {
                                  dispatch(
                                      new events.credentialsUpdate({
                                          emailAddress: inputs.emailInput || '',
                                          password: event.detail,
                                      }),
                                  );
                                  updateState({
                                      receivedUserInputSinceError: {
                                          ...state.receivedUserInputSinceError,
                                          password: true,
                                      },
                                  });
                              })}
                          ></${ViraInput}>
                      </label>
                  `;

        const submitTemplate =
            inputs.submitButtonText == undefined
                ? nothing
                : html`
                      <${ViraButton.assign({
                          text: inputs.submitButtonText,
                          disabled: !isSubmitEnabled,
                          icon: inputs.isLoading ? LoaderAnimated24Icon : undefined,
                      })}
                          ${listen('click', () => {
                              if (!isSubmitEnabled) {
                                  return;
                              }
                              updateState({
                                  receivedUserInputSinceError: {
                                      email: false,
                                      password: false,
                                  },
                              });
                              dispatch(new events.submit());
                          })}
                      ></${ViraButton}>
                  `;

        return keyed(
            inputs.isCreatingAccount,
            html`
                <section
                    ${listenToEnter(() => {
                        if (!isSubmitEnabled) {
                            return;
                        }
                        dispatch(new events.submit());
                    })}
                >
                    <form>${emailTemplate}${passwordTemplate}</form>
                    ${submitTemplate}
                </section>

                ${errorTemplate} ${infoTemplate}
            `,
        );
    },
});
