import {check, checkWrap} from '@augment-vir/assert';
import {combineErrorMessages, ensureErrorAndPrependMessage} from '@augment-vir/common';
import {colorCss} from '@electrovir/color';
import {csrfOptions, ScreenSize, type UserResponse} from '@evir/common';
import {
    createFrontendState,
    type FrontendState,
} from '@evir/frontend/src/data/frontend-state/frontend-state.js';
import {wipeCurrentCsrfToken} from 'auth-vir';
import {asyncProp, type AsyncValue, css, html, type HtmlInterpolation, listen} from 'element-vir';
import {ViraError} from 'vira';
import {resetAuthBlock} from '../../../data/frontend-state/frontend-clients/api.client.js';
import {type FrontendStateObservable} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {LogoutEvent} from '../../events/logout.event.js';
import {ScrollToTopEvent} from '../../events/scroll-to-top.event.js';
import {TeamSwitchEvent} from '../../events/team-switch.event.js';
import {UserEditEvent} from '../../events/user-edit.event.js';
import {UserThemeSelectEvent} from '../../events/user-theme-select.event.js';
import {appColors} from '../../styles/color-theme.js';
import {appCssVars} from '../../styles/css-vars.js';
import {AppLoader, centeredMessageStyles} from '../common/app-loader.element.js';
import {defineAppElement} from '../common/define-app-element.js';
import {renderAppAsyncProp} from '../common/render-app-async-prop.js';
import {AppAdminBanner} from '../header/app-admin-banner.element.js';
import {AppHeader} from '../header/app-header.element.js';
import {AppFooter} from './app-footer.element.js';

const topLevelPageKeys = [
    'create-account',
    'forgot-password',
    'reset-password',
    'app',
    'design',
    'link',
    'verify',
] as const;

type TopLevelPageKey = (typeof topLevelPageKeys)[number] | 'marketing';

function getTopLevelPageKey(frontendState: Readonly<FrontendState>): TopLevelPageKey {
    const topPath = frontendState.currentRoute.paths[0];

    return checkWrap.isIn(topPath, topLevelPageKeys) ?? 'marketing';
}

type PageRenderFunction = (frontendState: Readonly<FrontendState>) => HtmlInterpolation;

const pageLoaders: Readonly<Record<TopLevelPageKey, () => Promise<PageRenderFunction>>> = {
    'create-account': async () => {
        const {AppCreateAccount} = await import('../login/app-create-account.element.js');

        return (frontendState) => {
            return html`
                <${AppCreateAccount.assign({
                    frontendState,
                })}></${AppCreateAccount}>
            `;
        };
    },
    'forgot-password': async () => {
        const {AppResetPasswordPage} = await import('../login/app-reset-password-page.element.js');

        return (frontendState) => {
            return html`
                <${AppResetPasswordPage.assign({
                    frontendState,
                })}></${AppResetPasswordPage}>
            `;
        };
    },
    'reset-password': async () => {
        const {AppResetPasswordPage} = await import('../login/app-reset-password-page.element.js');

        return (frontendState) => {
            return html`
                <${AppResetPasswordPage.assign({
                    frontendState,
                })}></${AppResetPasswordPage}>
            `;
        };
    },
    app: async () => {
        const {AppUserAppPage} = await import('../user-app/app-user-app-page.element.js');

        return (frontendState) => {
            return html`
                <${AppUserAppPage.assign({
                    frontendState,
                })}></${AppUserAppPage}>
            `;
        };
    },
    design: async () => {
        const {AppDesign} = await import('../design/app-design.element.js');

        return (frontendState) => {
            return html`
                <${AppDesign.assign({
                    frontendState,
                })}></${AppDesign}>
            `;
        };
    },
    link: async () => {
        const {AppLinkProxy} = await import('../user-app/app-link-proxy.element.js');

        return (frontendState) => {
            return html`
                <${AppLinkProxy.assign({
                    frontendState,
                })}></${AppLinkProxy}>
            `;
        };
    },
    verify: async () => {
        const {AppVerifyPage} = await import('../verify-code/app-verify-page.element.js');

        return (frontendState) => {
            return html`
                <${AppVerifyPage.assign({
                    frontendState,
                })}></${AppVerifyPage}>
            `;
        };
    },
    marketing: async () => {
        const {AppMarketingPage} = await import('../marketing/app-marketing-page.element.js');

        return (frontendState) => {
            return html`
                <${AppMarketingPage.assign({
                    frontendState,
                })}></${AppMarketingPage}>
            `;
        };
    },
};

const footerMargin = 32;

export const AppEntryPoint = defineAppElement()({
    tagName: 'app-entry-point',
    state({host}) {
        return {
            frontendState: createFrontendState({
                hostElement: host,
            }) as AsyncValue<FrontendStateObservable>,
            dynamicPage: asyncProp({
                async updateCallback(pageKey: TopLevelPageKey): Promise<PageRenderFunction> {
                    return pageLoaders[pageKey]();
                },
                equalityCheck: check.strictEquals,
            }),
        };
    },
    hostClasses: {
        'app-entry-point-phone-size': ({state}) =>
            checkWrap.notInstanceOf(checkWrap.isNotPromise(state.frontendState), Error)?.value
                .screenSize === ScreenSize.Phone,
    },
    styles: ({hostClasses}) => css`
        :host {
            max-width: 100%;
            min-height: 100%;

            display: flex;
            flex-direction: column;
            font-family: sans-serif;
            ${colorCss(appColors.colors['app-backdrop-primary'])};
        }

        ${ViraError} {
            ${centeredMessageStyles}
        }

        .everything-wrapper {
            display: block;
            min-height: 100%;
            max-width: 100%;
            position: relative;
        }

        .page-wrapper {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            min-height: calc(100vh - ${footerMargin + 3}px);
        }

        ${AppLoader} {
            align-self: center;
        }
        ${AppHeader} {
            margin-bottom: 16px;
        }

        ${hostClasses['app-entry-point-phone-size'].selector} {
            ${appCssVars['app-content-padding'].name}: 8px;
            ${appCssVars['app-page-padding'].name}: 16px;
            ${appCssVars['app-large-wrapper-border-radius'].name}: 0;
            ${appCssVars['app-small-wrapper-border-radius'].name}: 0;
            ${appCssVars['app-wrapper-border-width'].name}: 1px 0;

            & ${AppHeader} {
                margin-bottom: 0;
            }
        }
    `,
    init({state, updateState}) {
        if (state.frontendState instanceof Promise) {
            state.frontendState
                .then((resolvedFrontendState) => {
                    resolvedFrontendState.listen(true, () => {
                        updateState({
                            frontendState: resolvedFrontendState,
                        });
                    });
                })
                .catch((error: unknown) => {
                    updateState({
                        frontendState: ensureErrorAndPrependMessage(
                            error,
                            'Frontend state init failed.',
                        ),
                    });
                });
        }
    },
    render({state}) {
        if (state.frontendState instanceof Promise) {
            return html`
                <${AppLoader}></${AppLoader}>
            `;
        } else if (state.frontendState instanceof Error) {
            return html`
                <${ViraError}>
                    ${combineErrorMessages('Failed to load.', state.frontendState)}
                </${ViraError}>
            `;
        }

        const frontendStateObservable: FrontendStateObservable = state.frontendState;
        const frontendState: FrontendState = frontendStateObservable.value;

        state.dynamicPage.update(getTopLevelPageKey(frontendState));

        return html`
            <div
                class="everything-wrapper"
                ${listen(LogoutEvent, async () => {
                    await Promise.allSettled([
                        wipeCurrentCsrfToken(csrfOptions),
                        frontendState.frontendAuthClient.logout(),
                    ]);

                    window.scrollTo({
                        behavior: 'instant',
                        left: 0,
                        top: 0,
                    });
                })}
                ${listen(ChangeRouteEvent, (event) => {
                    frontendState.router.setRoute(event.detail, {
                        replace: !!event.detail.replace,
                    });
                    if (event.detail.scrollToTop) {
                        window.scrollTo(0, 0);
                    }
                })}
                ${listen(UserThemeSelectEvent, (event) => {
                    frontendState.themeClient.applyTheme(event.detail);
                })}
                ${listen(ScrollToTopEvent, () => {
                    window.scrollTo(0, 0);
                })}
                ${listen(TeamSwitchEvent, async (event) => {
                    frontendState.localStorageClient.set.selectedTeamId(event.detail);
                    const result = await frontendState.apiClient.endpoints['/user'].fetch();

                    if (result.ok) {
                        frontendStateObservable.update({
                            user: result.data,
                        });
                    }
                })}
                ${listen(UserEditEvent, (event) => {
                    const user = frontendState.user;
                    const isLogin = !user;

                    if (isLogin) {
                        resetAuthBlock();
                    }

                    const modifiedUser = {
                        ...(user instanceof Error || user instanceof Promise || !user ? {} : user),
                        ...event.detail,
                    } as UserResponse;

                    frontendStateObservable.update({
                        user: modifiedUser,
                    });
                })}
            >
                <${AppAdminBanner.assign({
                    frontendState,
                })}></${AppAdminBanner}>
                <div class="page-wrapper">
                    <${AppHeader.assign({
                        frontendState,
                    })}></${AppHeader}>
                    ${renderAppAsyncProp(state.dynamicPage, {
                        errorMessage: 'Failed to load page.',
                        onSuccess(renderPage) {
                            return renderPage(frontendState);
                        },
                    })}
                </div>
                <${AppFooter.assign({
                    frontendState,
                })}></${AppFooter}>
            </div>
        `;
    },
});
