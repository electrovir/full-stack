import {combineErrorMessages} from '@augment-vir/common';
import {extractEventTarget} from '@augment-vir/web';
import {colorCss} from '@electrovir/color';
import {DeployEnv} from '@evir/common';
import {asyncProp, css, html, listen, listenToEnter, nothing} from 'element-vir';
import {themeDefaultKey} from 'theme-vir';
import {LoaderAnimated24Icon, ViraButton, viraTheme} from 'vira';
import {type FrontendState} from '../../../../data/frontend-state/frontend-state.js';
import {appColors} from '../../../styles/color-theme.js';
import {wrapperBorderCss, WrapperElementSize} from '../../../styles/wrapper.js';
import {defineAppElement} from '../../common/define-app-element.js';
import {renderAppAsyncProp} from '../../common/render-app-async-prop.js';

export const AppInternalAdminDevDb = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
}>()({
    tagName: 'app-internal-admin-dev-db',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 32px;
            align-items: center;
        }

        .empty {
            ${colorCss(appColors.colors['app-body-secondary'])}
        }

        .query-form {
            max-width: 100%;
            width: 800px;
            display: flex;
            flex-direction: column;
            gap: 8px;

            & ${ViraButton} {
                align-self: center;
            }
        }

        textarea {
            ${colorCss(viraTheme.colors[themeDefaultKey])}
            font: inherit;
            padding: 16px;
            ${wrapperBorderCss({
                color: appColors.colors['app-divider-secondary'].foreground.value,
                size: WrapperElementSize.Small,
            })}
            height: 100px;
            resize: vertical;
        }
    `,
    state({inputs}) {
        return {
            query: inputs.frontendState.localStorageClient.get.devDbCache() || '',
            queryResult: asyncProp({
                defaultValue: '',
                async updateCallback({query}: {query: string}) {
                    const {ok, data} = await inputs.frontendState.apiClient.endpoints[
                        '/internal-admin/dev-db'
                    ].fetch({
                        requestData: {
                            query,
                        },
                    });
                    if (!ok) {
                        throw new Error(
                            combineErrorMessages(
                                inputs.frontendState.i18nClient.get.AppInternalAdminDevDb
                                    .failedToRunQuery,
                                data,
                            ),
                        );
                    }
                    return data;
                },
            }),
        };
    },
    render({inputs, state, updateState}) {
        if (
            !inputs.frontendState.user.isInternalAdmin ||
            inputs.frontendState.frontendEnvClient.deployEnv !== DeployEnv.Dev
        ) {
            return nothing;
        }

        const resultTemplate = renderAppAsyncProp(state.queryResult, {
            errorMessage: inputs.frontendState.i18nClient.get.AppInternalAdminDevDb.queryFailed,
            onSuccess(queryResult) {
                if (queryResult) {
                    return html`
                        <pre>${JSON.stringify(queryResult, null, 4)}</pre>
                    `;
                } else {
                    return html`
                        <p class="empty">
                            ${inputs.frontendState.i18nClient.get.AppInternalAdminDevDb
                                .runQueryPrompt}
                        </p>
                    `;
                }
            },
        });

        return html`
            <section class="query-form">
                <textarea
                    spellcheck="false"
                    .value=${state.query}
                    ${listen('input', (event) => {
                        const value = extractEventTarget(event, HTMLTextAreaElement).value;
                        inputs.frontendState.localStorageClient.set.devDbCache(value);
                        updateState({
                            query: value,
                        });
                    })}
                    ${listenToEnter(() => {
                        state.queryResult.update({
                            query: state.query,
                        });
                    })}
                ></textarea>
                <${ViraButton.assign({
                    text: inputs.frontendState.i18nClient.get.AppInternalAdminDevDb.submitButton,
                    isDisabled: state.queryResult instanceof Promise,
                    icon: state.queryResult instanceof Promise ? LoaderAnimated24Icon : undefined,
                })}
                    ${listen('click', () => {
                        state.queryResult.update({
                            query: state.query,
                        });
                    })}
                ></${ViraButton}>
            </section>
            <section>${resultTemplate}</section>
        `;
    },
});
