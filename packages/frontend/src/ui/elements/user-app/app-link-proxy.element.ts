import {combineErrorMessages, stringify} from '@augment-vir/common';
import {type FrontendRoute} from '@evir/common';
import {asyncProp, css, html} from 'element-vir';
import {parseUrl} from 'url-vir';
import {ViraError} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {defineAppElement} from '../common/define-app-element.js';

export const AppLinkProxy = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-link-proxy',
    styles: css`
        :host {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
        }
    `,
    state({inputs}) {
        return {
            redirect: asyncProp({
                async updateCallback(route: Readonly<FrontendRoute>) {
                    const linkId = route.paths[1];
                    if (!linkId) {
                        throw new Error(
                            inputs.frontendState.i18nClient.get.AppLinkProxy.missingLink,
                        );
                    }
                    const {ok, data} = await inputs.frontendState.apiClient.endpoints[
                        '/get-link/:linkId'
                    ].fetch({
                        pathParams: {
                            linkId,
                        },
                    });

                    if (ok) {
                        if (!data.link) {
                            throw new Error(
                                inputs.frontendState.i18nClient.get.AppLinkProxy.emptyLink,
                            );
                        }
                        const linkOrigin = parseUrl(data.link).origin;

                        if (
                            !linkOrigin.endsWith(
                                '.' +
                                    inputs.frontendState.frontendEnvClient.universalConfig
                                        .topDomain,
                            )
                        ) {
                            throw new Error(
                                inputs.frontendState.i18nClient.get.AppLinkProxy.invalidLink,
                            );
                        }

                        window.location.replace(data.link);
                        return data.link;
                    } else {
                        throw new Error(
                            combineErrorMessages(
                                inputs.frontendState.i18nClient.get.AppLinkProxy.failedToLoadLink,
                                stringify(data),
                            ),
                        );
                    }
                },
            }),
        };
    },
    render({state, inputs}) {
        state.redirect.update(inputs.frontendState.currentRoute);

        if (state.redirect.settledValue instanceof Error) {
            return html`
                <${ViraError}>${state.redirect.settledValue.message}</${ViraError}>
            `;
        }
        return html`
            <span>${inputs.frontendState.i18nClient.get.AppLinkProxy.loading}</span>
        `;
    },
});
