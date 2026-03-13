import {frontendPathTree, ScreenSize} from '@evir/common';
import {classMap, css, html} from 'element-vir';
import {type GenericTreePaths, routeHasPaths} from 'spa-router-vir';
import {noNativeSpacing, ViraLink} from 'vira';
import {stateMatches} from '../../../data/frontend-state/frontend-state-checks.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appColors} from '../../styles/color-theme.js';
import {AppLogo} from '../common/app-logo.element.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppUserHeader} from './app-user-header.element.js';

const headerHeight = 60;
const smallHorizontalPadding = css`8px`;

export const AppHeader = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-header',
    hostClasses: {
        'app-header-phone-size': ({inputs}) => inputs.frontendState.screenSize === ScreenSize.Phone,
    },
    styles: ({hostClasses}) => css`
        :host {
            display: flex;
            justify-content: center;
            z-index: 99999;
        }

        nav {
            /* Do not add any overflow in here as it will block the user dropdown. */
            display: flex;
            flex-grow: 1;
            align-items: center;
            padding: 0 12px;
            padding-left: 24px;
            gap: 16px;
            max-height: ${headerHeight}px;
            height: ${headerHeight}px;
            box-sizing: border-box;
        }

        .tabs {
            flex-shrink: 0;
            align-self: stretch;
            flex-wrap: wrap-reverse;
            gap: inherit;
            display: flex;
            align-items: center;
            overflow: hidden;
            margin-right: auto;
        }

        .tab {
            height: ${headerHeight}px;
            font-weight: bold;
            font-size: 18px;
        }

        header {
            height: ${headerHeight}px;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            display: flex;
            justify-content: center;
        }

        p {
            ${noNativeSpacing};
        }

        nav > * {
            flex-shrink: 0;
            white-space: nowrap;
            display: flex;
            align-items: center;
        }

        .header-logo {
            margin-left: ${smallHorizontalPadding};
            flex-wrap: wrap;
            display: flex;
            align-items: center;
            font-size: 24px;
            white-space: nowrap;
            height: 48px;
            overflow: hidden;
        }

        ${ViraLink} {
            overflow: hidden;
            display: flex;
            align-items: center;
            cursor: pointer;
        }

        .logo-link {
            flex-shrink: 100;
            margin-right: auto;
        }

        ${AppLogo} {
            height: inherit;
            justify-content: center;
            overflow: hidden;
            flex-wrap: wrap;
        }

        .current-tab {
            color: ${appColors.colors['app-body-action-primary'].foreground.value};
        }

        .disable-clicks {
            pointer-events: none;
            text-decoration: none;
        }

        ${hostClasses['app-header-phone-size'].selector} {
            & nav {
                padding-right: ${smallHorizontalPadding};
                padding-left: ${smallHorizontalPadding};
            }
        }
    `,
    render({inputs}) {
        const headerTabs: {label: string; path: GenericTreePaths}[] = stateMatches(
            inputs.frontendState,
            {
                hasUser: true,
            },
        )
            ? [
                  {
                      label: inputs.frontendState.i18nClient.get.AppHeader.appTab,
                      path: frontendPathTree.paths.children.app,
                  },
              ]
            : [];

        const tabTemplates = headerTabs.map((tab) => {
            const isCurrentTab = routeHasPaths(inputs.frontendState.currentRoute, tab.path);

            return html`
                <${ViraLink.assign({
                    route: {
                        router: inputs.frontendState.router,
                        route: {
                            paths: tab.path.fullPaths,
                        },
                    },
                    attributePassthrough: {
                        a: {
                            'aria-label':
                                inputs.frontendState.i18nClient.get.AppHeader.navigateToTab({
                                    tabName: tab.label,
                                }),
                            ...(isCurrentTab
                                ? {
                                      'aria-current': 'page',
                                  }
                                : {}),
                        },
                    },
                })}
                    class="tab ${classMap({
                        'current-tab': isCurrentTab,
                        'disable-clicks': routeHasPaths(
                            inputs.frontendState.currentRoute,
                            tab.path,
                            {
                                exactMatch: true,
                            },
                        ),
                    })}"
                >
                    ${tab.label}
                </${ViraLink}>
            `;
        });

        const userHeader = stateMatches(inputs.frontendState, {
            hasUser: true,
        })
            ? html`
                  <nav>
                      <div class="tabs">${tabTemplates}</div>
                      <${AppUserHeader.assign({
                          frontendState: inputs.frontendState,
                      })}></${AppUserHeader}>
                  </nav>
              `
            : undefined;

        return html`
            <header>
                <${ViraLink.assign({
                    route: {
                        router: inputs.frontendState.router,
                        route: {
                            paths: [],
                        },
                        scrollToTop: true,
                    },
                    attributePassthrough: {
                        a: {
                            'aria-label':
                                inputs.frontendState.i18nClient.get.AppHeader.navigateToHome,
                        },
                    },
                    stylePassthrough: {
                        a: css`
                            overflow: hidden;
                        `,
                    },
                })}
                    class="logo-link"
                >
                    <div class="header-logo">
                        <${AppLogo}></${AppLogo}>
                    </div>
                </${ViraLink}>
                ${userHeader}
            </header>
        `;
    },
});
