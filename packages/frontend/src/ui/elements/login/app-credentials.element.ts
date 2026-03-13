import {check} from '@augment-vir/assert';
import {filterMap, mapObjectValues, type PartialWithUndefined} from '@augment-vir/common';
import {
    css,
    defineElementEvent,
    html,
    keyed,
    listen,
    listenToEnter,
    nothing,
    testId,
    type HTMLTemplateResult,
} from 'element-vir';
import {
    LoaderAnimated24Icon,
    ViraButton,
    ViraCard,
    ViraCardState,
    ViraError,
    ViraForm,
    ViraFormFieldType,
    ViraInput,
    type ViraFormFields,
} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {defineAppElement} from '../common/define-app-element.js';

/** Error messages for each input type. */
export type CredentialErrors = PartialWithUndefined<{
    email: string;
    password: string;
    /** An error message not specifically related to email or password. */
    generic: string;
}>;

/**
 * This element automatically takes up its minimal space. You must externally set a width or
 * horizontal `flex-grow` on it to make it takes up more space.
 */
export const AppCredentials = defineAppElement<{
    frontendState: Readonly<FrontendState>;
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

    /** Set to `undefined` to remove the submit button. */
    submitButtonText: string | undefined;

    /**
     * Is set to `true`, the submit button is disabled.
     *
     * @default false
     */
    submitDisabled?: boolean | undefined;
    extraFormFields?: ViraFormFields | undefined;

    isLoading: boolean;

    isCreatingAccount: boolean;
    infoLines: ReadonlyArray<string | HTMLTemplateResult>;
    errors: undefined | Readonly<CredentialErrors>;
}>()({
    tagName: 'app-credentials',
    testIds: [
        'emailInput',
        'passwordInput',
        'submitButton',
    ],
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

        label {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: flex-start;
            gap: 2px;
        }

        ${ViraButton} {
            align-self: center;
        }

        .input-name {
            font-weight: bold;
            text-align: left;
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

        li {
            list-style: none;
            text-align: center;
        }
    `,
    events: {
        credentialsUpdate: defineElementEvent<{
            emailAddress: string;
            password: string;
        }>(),
        extraFormFieldsUpdate:
            defineElementEvent<Record<string, number | string | boolean | undefined>>(),
        submit: defineElementEvent<void>(),
    },
    render({inputs, dispatch, events, testIds}) {
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
                  <${ViraCard.assign({
                      cardState: ViraCardState.Error,
                  })}>
                      <${ViraError}>
                          <ul>
                              ${errorRowTemplates}
                          </ul>
                      </${ViraError}>
                  </${ViraCard}>
              `
            : nothing;

        const hasInputs =
            (inputs.emailInput == undefined ? true : !!inputs.emailInput) &&
            (inputs.passwordInput == undefined ? true : !!inputs.passwordInput);

        const isSubmitEnabled: boolean = hasInputs && !inputs.isLoading && !inputs.submitDisabled;

        const infoRowTemplates = inputs.infoLines.map((infoLine) => {
            return html`
                <li>${infoLine}</li>
            `;
        });

        const infoTemplate = infoRowTemplates.length
            ? html`
                  <${ViraCard}>
                      <ul>
                          ${infoRowTemplates}
                      </ul>
                  </${ViraCard}>
              `
            : nothing;

        const submitTemplate =
            inputs.submitButtonText == undefined
                ? nothing
                : html`
                      <${ViraButton.assign({
                          text: inputs.submitButtonText,
                          isDisabled: !isSubmitEnabled,
                          icon: inputs.isLoading ? LoaderAnimated24Icon : undefined,
                      })}
                          ${testId(testIds.submitButton)}
                          ${listen('click', async () => {
                              if (!isSubmitEnabled) {
                                  return;
                              }
                              await inputs.frontendState.frontendAuthClient.assumeUser(undefined);
                              dispatch(new events.submit());
                          })}
                      ></${ViraButton}>
                  `;

        const formFields: ViraFormFields = {
            ...(inputs.emailInput == undefined
                ? {}
                : {
                      emailAddress: {
                          type: ViraFormFieldType.Email,
                          value: inputs.emailInput,
                          label: inputs.frontendState.i18nClient.get.AppCredentials.emailLabel,
                          isUsername: true,
                          hasError: !!inputs.errors?.email,
                          testId: testIds.emailInput,
                      },
                  }),
            ...(inputs.passwordInput == undefined
                ? {}
                : {
                      password: {
                          type: inputs.isCreatingAccount
                              ? ViraFormFieldType.NewPassword
                              : ViraFormFieldType.ExistingPassword,
                          label: inputs.frontendState.i18nClient.get.AppCredentials.passwordLabel,
                          value: inputs.passwordInput,
                          hasError: !!inputs.errors?.password,
                          testId: testIds.passwordInput,
                      },
                  }),
            ...mapObjectValues(inputs.extraFormFields || {}, (key, field) => {
                return {
                    ...field,
                    disabled: inputs.isLoading,
                };
            }),
        };

        return keyed(
            inputs.isCreatingAccount,
            html`
                <section
                    ${listenToEnter(async () => {
                        if (!isSubmitEnabled) {
                            return;
                        }
                        await inputs.frontendState.frontendAuthClient.assumeUser(undefined);
                        dispatch(new events.submit());
                    })}
                >
                    <${ViraForm.assign({
                        fields: formFields,
                        isDisabled: inputs.isLoading,
                    })}
                        ${listen(ViraForm.events.valueChange, (event) => {
                            const credentialValues = {
                                password: inputs.passwordInput || '',
                                emailAddress: inputs.emailInput || '',
                            };
                            const extraFormFieldValues: Record<
                                string,
                                number | string | boolean | undefined
                            > = mapObjectValues(inputs.extraFormFields || {}, (key, {value}) => {
                                return value;
                            });

                            if (check.isKeyOf(event.detail.key, credentialValues)) {
                                dispatch(
                                    new events.credentialsUpdate({
                                        ...credentialValues,
                                        [event.detail.key]: event.detail.value,
                                    }),
                                );
                            } else if (check.isKeyOf(event.detail.key, extraFormFieldValues)) {
                                dispatch(
                                    new events.extraFormFieldsUpdate({
                                        ...extraFormFieldValues,
                                        [event.detail.key]: event.detail.value,
                                    }),
                                );
                            }
                        })}
                    >
                        <slot></slot>
                        ${submitTemplate}
                    </${ViraForm}>
                </section>

                ${errorTemplate} ${infoTemplate}
            `,
        );
    },
});
