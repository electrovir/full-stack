import {filterMap} from '@augment-vir/common';
import {css, html, nothing, type HtmlInterpolation} from 'element-vir';
import {routeHasPaths, type GenericTreePaths} from 'spa-router-vir';
import {ViraLink} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appColors} from '../../styles/color-theme.js';
import {appCssVars} from '../../styles/css-vars.js';
import {defineAppElement} from './define-app-element.js';

export type AppTab = {
    /** The content of the tab itself. */
    tabContent: HtmlInterpolation;
    /** The content to display on the page for this tab. */
    pageContent: HtmlInterpolation;
    paths: GenericTreePaths;
    /** If set to `true`, this tab is not displayed at all. */
    isHidden?: boolean | undefined;
};

export const AppTabs = defineAppElement<{
    frontendState: Readonly<FrontendState>;
    tabs: ReadonlyArray<Readonly<AppTab>>;
    withPadding: boolean;
}>()({
    tagName: 'app-tabs',
    hostClasses: {
        'app-tabs-with-padding': ({inputs}) => inputs.withPadding,
    },
    styles: ({hostClasses}) => css`
        :host {
            display: flex;
            flex-direction: column;
            gap: ${appCssVars['app-content-padding'].value};
        }

        :host > *:not(ul:first-child) {
            flex-grow: 1;
        }

        ${hostClasses['app-tabs-with-padding'].selector} {
            & > *:not(ul:first-child) {
                margin-left: ${appCssVars['app-page-padding'].value};
                margin-right: ${appCssVars['app-page-padding'].value};
            }
        }

        [role='tablist'] {
            margin: 0;
            padding: 8px 24px;
            display: flex;
            flex-wrap: wrap;
            gap: 24px;
            border-bottom: 1px solid ${appColors.colors['app-divider-secondary'].foreground.value};

            & [role='tab'] {
                &[aria-selected='true'] {
                    pointer-events: none;
                    text-decoration: none;
                    color: ${appColors.colors['app-body-action-primary'].foreground.value};
                }
            }

            & li {
                list-style: none;
            }
        }
    `,
    render({inputs}) {
        let currentPageContent: HtmlInterpolation = nothing;

        const tabTemplates = filterMap(
            inputs.tabs,
            (tab) => {
                const isCurrentRoute = routeHasPaths(inputs.frontendState.currentRoute, tab.paths);

                if (isCurrentRoute) {
                    currentPageContent = tab.pageContent;
                }

                return html`
                    <li>
                        <${ViraLink.assign({
                            route: {
                                router: inputs.frontendState.router,
                                route: {
                                    paths: tab.paths.fullPaths,
                                },
                                scrollToTop: true,
                            },
                        })}
                            role="tab"
                            aria-selected=${String(isCurrentRoute)}
                        >
                            ${tab.tabContent}
                        </${ViraLink}>
                    </li>
                `;
            },
            (mappedTab, tab) => !tab.isHidden,
        );

        return html`
            <ul role="tablist">
                ${tabTemplates.length > 1 ? tabTemplates : nothing}
            </ul>
            ${currentPageContent}
        `;
    },
});
