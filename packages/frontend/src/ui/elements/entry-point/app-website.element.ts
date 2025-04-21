import {log, omitObjectKeys} from '@augment-vir/common';
import {frontendPathTree, matchesPath, type UserResponse} from '@evir/common';
import {wipeCurrentCsrfToken} from 'auth-vir';
import {css, defineElementNoInputs, html, listen} from 'element-vir';
import {createFrontendState} from '../../../data/frontend-state/create-frontend-state.js';
import {stateHasPath} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {LogOutEvent} from '../../events/log-out.event.js';
import {UserEditEvent} from '../../events/user-edit.event.js';
import {contentWidthCss} from '../../styles/styles.js';
import {AppApp} from '../app/app-app.element.js';
import {AppLandingPage} from '../landing-page/app-landing-page.element.js';
import {AppModal} from '../modals/app-modal.element.js';
import {AppVerification} from '../sign-in/app-verification.element.js';
import {AppFooter} from './app-footer.element.js';
import {AppHeader} from './app-header.element.js';

const footerMargin = 32;

export const AppWebsite = defineElementNoInputs({
    tagName: 'app-website',
    state() {
        return {
            ...createFrontendState(),
            cleanup: undefined as undefined | (() => void),
        };
    },
    hostClasses: {
        'app-website-sticky-header': ({state}) => !state.currentRoute.paths.length,
    },
    styles: ({hostClasses}) => css`
        :host {
            display: block;
            min-height: 100%;
            max-width: 100%;
            font-family: sans-serif;
        }

        .everything-wrapper {
            display: block;
            min-height: 100%;
            max-width: 100%;
            position: relative;
            overflow-x: hidden;
        }
        .content {
            ${contentWidthCss}
            overflow: hidden;
        }

        .page-wrapper {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            min-height: calc(100vh - ${footerMargin}px);
        }

        .page-wrapper > *:last-child {
            flex-grow: 1;
        }

        ${AppFooter} {
            margin-top: ${footerMargin}px;
        }

        ${hostClasses['app-website-sticky-header'].selector} ${AppHeader} {
            position: sticky;
            top: 0;
            z-index: 999;
        }

        ${AppLandingPage} {
            margin-top: 100px;
        }
    `,
    init({state, updateState}) {
        state.cleanup?.();
        updateState({
            cleanup: state.router.listen(true, (newRoute) => {
                updateState({currentRoute: newRoute});
            }),
        });
    },
    cleanup({state, updateState}) {
        state.cleanup?.();
        updateState({
            cleanup: undefined,
        });
    },
    render({state}) {
        const frontendState = omitObjectKeys(state, ['cleanup']);

        const user: Readonly<UserResponse> | undefined =
            frontendState.user.settledValue && !(frontendState.user.settledValue instanceof Error)
                ? frontendState.user.settledValue
                : undefined;

        if (frontendState.user.isError()) {
            log.error(frontendState.user.value);
            frontendState.user.setValue(undefined);
            wipeCurrentCsrfToken();
        }

        const pageTemplate = stateHasPath(state, frontendPathTree.paths.children.app.fullPaths)
            ? html`
                  <${AppApp.assign(state)}></${AppApp}>
              `
            : matchesPath(
                    frontendState.currentRoute,
                    frontendPathTree.paths.children.verify.fullPaths,
                )
              ? html`
                    <${AppVerification.assign(state)}></${AppVerification}>
                `
              : html`
                    <${AppLandingPage.assign({
                        router: state.router,
                    })}></${AppLandingPage}>
                `;

        return html`
            <div
                class="everything-wrapper"
                ${listen(LogOutEvent, () => {
                    wipeCurrentCsrfToken();
                    frontendState.user.setValue(undefined);
                    frontendState.router.setRoute({
                        paths: [],
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
                ${listen(UserEditEvent, (event) => {
                    const modifiedUser = {
                        ...user,
                        ...event.detail,
                    } as UserResponse;

                    frontendState.user.setValue(modifiedUser);
                })}
            >
                <div class="page-wrapper">
                    <${AppHeader.assign(frontendState)}></${AppHeader}>
                    ${pageTemplate}
                </div>
                <${AppModal.assign(frontendState)}></${AppModal}>
                <${AppFooter}></${AppFooter}>
            </div>
        `;
    },
});
