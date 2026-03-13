import {combineErrorMessages, wait} from '@augment-vir/common';
import {extractEventTarget} from '@augment-vir/web';
import {colorCss} from '@electrovir/color';
import {css, defineElementEvent, html, listen, nothing} from 'element-vir';
import {themeDefaultKey} from 'theme-vir';
import {LoaderAnimated24Icon, ViraButton, ViraColorVariant, ViraError, viraTheme} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appColors} from '../../styles/color-theme.js';
import {appFont} from '../../styles/font.js';
import {defineAppElement} from '../common/define-app-element.js';

export const AppFeedback = defineAppElement<{
    frontendState: Readonly<FrontendState>;
    startUrl: string;
}>()({
    tagName: 'app-feedback',
    events: {
        closeFeedback: defineElementEvent<void>(),
    },
    state() {
        return {
            feedbackInput: '',
            isLoading: false,
            submitSucceeded: false,
            submitError: '',
        };
    },
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        label {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        textarea {
            ${colorCss(viraTheme.colors[themeDefaultKey])}
            width: 600px;
            height: 200px;
            max-width: 100%;
            font: inherit;
        }

        .buttons {
            display: flex;
            gap: 4px;
            align-self: flex-end;
        }

        .submit-success {
            text-align: center;
            ${colorCss(appColors.colors['app-brand-primary'])}
            ${appFont.largeBody}
        }
    `,
    render({inputs, state, updateState, events, dispatch}) {
        if (state.submitSucceeded) {
            return html`
                <p class="submit-success">
                    ${inputs.frontendState.i18nClient.get.AppFeedback.feedbackSubmittedSuccessfully}
                </p>
            `;
        }

        return html`
            <label>
                ${inputs.frontendState.i18nClient.get.AppFeedback.feedbackInputLabel}
                <textarea
                    .value=${state.feedbackInput}
                    ${listen('input', (event) => {
                        const element = extractEventTarget(event, HTMLTextAreaElement);
                        updateState({
                            feedbackInput: element.value,
                        });
                    })}
                ></textarea>
            </label>
            ${state.submitError
                ? html`
                      <${ViraError}>${state.submitError}</${ViraError}>
                  `
                : nothing}
            <div class="buttons">
                <${ViraButton.assign({
                    text: inputs.frontendState.i18nClient.get.AppFeedback.cancelFeedbackButton,
                    colorVariant: ViraColorVariant.Neutral,
                    isDisabled: state.isLoading,
                })}
                    ${listen('click', () => {
                        updateState({
                            submitSucceeded: false,
                            feedbackInput: '',
                            submitError: '',
                            isLoading: false,
                        });
                        dispatch(new events.closeFeedback());
                    })}
                ></${ViraButton}>
                <${ViraButton.assign({
                    text: inputs.frontendState.i18nClient.get.AppFeedback.submitFeedbackButton,
                    isDisabled: state.isLoading || !state.feedbackInput,
                    icon: state.isLoading ? LoaderAnimated24Icon : undefined,
                })}
                    ${listen('click', async () => {
                        if (!state.feedbackInput) {
                            return;
                        }

                        updateState({
                            isLoading: true,
                            submitSucceeded: false,
                            submitError: '',
                        });
                        try {
                            const {data, ok} = await inputs.frontendState.apiClient.endpoints[
                                '/feedback'
                            ].fetch({
                                requestData: {
                                    feedback: state.feedbackInput,
                                    startUrl: inputs.startUrl,
                                    submitUrl: globalThis.window.location.href,
                                },
                            });

                            if (ok) {
                                updateState({
                                    feedbackInput: '',
                                    submitSucceeded: true,
                                });
                            } else {
                                throw new Error(data);
                            }

                            void wait({
                                seconds: 5,
                            }).then(() => {
                                dispatch(new events.closeFeedback());
                                updateState({
                                    submitSucceeded: false,
                                });
                            });
                        } catch (error) {
                            updateState({
                                submitError: combineErrorMessages(
                                    inputs.frontendState.i18nClient.get.AppFeedback
                                        .failedToSendFeedback,
                                    error,
                                ),
                            });
                        } finally {
                            updateState({
                                isLoading: false,
                            });
                        }
                    })}
                ></${ViraButton}>
            </div>
        `;
    },
});
