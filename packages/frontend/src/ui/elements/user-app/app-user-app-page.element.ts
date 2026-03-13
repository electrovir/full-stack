import {check} from '@augment-vir/assert';
import {combineErrorMessages} from '@augment-vir/common';
import {ScreenSize} from '@evir/common';
import {asyncProp, css, html, type HtmlInterpolation, nothing} from 'element-vir';
import {LoaderAnimated24Icon, ViraError, ViraIcon} from 'vira';
import {stateMatches} from '../../../data/frontend-state/frontend-state-checks.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {appCssVars} from '../../styles/css-vars.js';
import {AppPage} from '../common/app-page.element.js';
import {defineAppElement} from '../common/define-app-element.js';
import {renderAppAsyncProp} from '../common/render-app-async-prop.js';
import {AppSignIn} from '../login/app-sign-in.element.js';

export const AppUserAppPage = defineAppElement<{frontendState: Readonly<FrontendState>}>()({
    tagName: 'app-user-app-page',
    state() {
        return {
            dynamicUserApp: asyncProp({
                async updateCallback(): Promise<
                    (frontendState: Readonly<FrontendState<void, true>>) => HtmlInterpolation
                > {
                    const {AppUserApp} = await import('./app-user-app.element.js');

                    return (frontendState) => {
                        return html`
                            <${AppUserApp.assign({
                                frontendState,
                            })}></${AppUserApp}>
                        `;
                    };
                },
                equalityCheck: check.strictEquals,
            }),
        };
    },
    hostClasses: {
        'app-user-app-page-phone-size': ({inputs}) =>
            inputs.frontendState.screenSize === ScreenSize.Phone,
    },
    styles: ({hostClasses}) => css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex-grow: 1;
            max-width: 100%;
            box-sizing: border-box;
        }
        /*
            Use the raw tag name here, instead of interpolation, so we don't have to import the user
            app.
        */
        app-user-app {
            flex-grow: 1;
            align-self: stretch;
        }

        ${AppPage} {
            max-width: 100%;
            box-sizing: border-box;
        }

        .sign-in-page {
            margin-top: ${appCssVars['app-small-page-header-margin'].value};
        }

        ${hostClasses['app-user-app-page-phone-size'].selector} {
            & .sign-in-page {
                margin-top: 0;
            }
        }
    `,
    render({inputs, state, dispatch}) {
        if (inputs.frontendState.user instanceof Promise) {
            return html`
                <${ViraIcon.assign({
                    icon: LoaderAnimated24Icon,
                })}></${ViraIcon}>
            `;
        } else if (inputs.frontendState.user instanceof Error) {
            return html`
                <${ViraError}>
                    <p>
                        ${combineErrorMessages(
                            inputs.frontendState.i18nClient.get.AppUserAppPage.failedToLoadUser,
                            inputs.frontendState.user,
                        )}
                    </p>
                </${ViraError}>
            `;
        } else if (
            stateMatches(inputs.frontendState, {
                hasUser: true,
            })
        ) {
            const frontendStateWithUser = inputs.frontendState;

            state.dynamicUserApp.update();

            return renderAppAsyncProp(state.dynamicUserApp, {
                errorMessage:
                    frontendStateWithUser.i18nClient.get.AppUserAppPage.failedToImportElement,
                onSuccess(renderPage) {
                    return renderPage(frontendStateWithUser);
                },
            });
        } else if (
            stateMatches(inputs.frontendState, {
                hasUser: false,
            })
        ) {
            return html`
                <${AppPage} class="sign-in-page">
                    <${AppSignIn.assign({
                        frontendState: inputs.frontendState,
                        wipeUrlAfterLogin: false,
                    })}></${AppSignIn}>
                </${AppPage}>
            `;
        } else {
            /** Something is wrong, get us back to a default route. */
            dispatch(
                new ChangeRouteEvent({
                    paths: [],
                    replace: true,
                }),
            );

            return nothing;
        }
    },
});
