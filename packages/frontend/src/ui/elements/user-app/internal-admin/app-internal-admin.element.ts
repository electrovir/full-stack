import {frontendPathTree} from '@evir/common';
import {css, html, nothing} from 'element-vir';
import {noNativeSpacing} from 'vira';
import {type FrontendState} from '../../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../../events/change-route.event.js';
import {contentWidthCss} from '../../../styles/content-width.js';
import {appCssVars} from '../../../styles/css-vars.js';
import {AppPage} from '../../common/app-page.element.js';
import {type AppTab, AppTabs} from '../../common/app-tabs.element.js';
import {defineAppElement} from '../../common/define-app-element.js';
import {AppInternalAdminDevDb} from './app-internal-admin-dev-db.element.js';
import {AppInternalAdminTeams} from './app-internal-admin-teams.element.js';

const internalAdminPathTree = frontendPathTree.paths.children.app.children['internal-admin'];

export const AppInternalAdmin = defineAppElement<{
    frontendState: Readonly<FrontendState<(typeof internalAdminPathTree)['PathsType'], true>>;
}>()({
    tagName: 'app-internal-admin',
    styles: css`
        :host {
            ${contentWidthCss}
            display: flex;
            flex-direction: column;
        }

        ${AppPage} {
            padding: 0;
        }

        h1 {
            ${noNativeSpacing};
            margin: ${appCssVars['app-page-padding'].value};
            margin-bottom: ${appCssVars['app-content-padding'].value};
        }
    `,
    render({inputs, dispatch}) {
        if (!inputs.frontendState.user.isInternalAdmin) {
            dispatch(
                new ChangeRouteEvent({
                    paths: [],
                }),
            );
            return nothing;
        }

        const internalAdminTabs: ReadonlyArray<Readonly<AppTab>> = [
            {
                tabContent: inputs.frontendState.i18nClient.get.AppInternalAdmin.tabs.teams,
                pageContent: html`
                    <${AppInternalAdminTeams.assign({
                        frontendState: inputs.frontendState,
                    })}></${AppInternalAdminTeams}>
                `,
                paths: internalAdminPathTree.children.teams,
            },
            {
                tabContent: inputs.frontendState.i18nClient.get.AppInternalAdmin.tabs.devDb,
                pageContent: html`
                    <${AppInternalAdminDevDb.assign({
                        frontendState: inputs.frontendState,
                    })}></${AppInternalAdminDevDb}>
                `,
                paths: internalAdminPathTree.children['dev-db'],
            },
        ];

        return html`
            <${AppPage}>
                <h1>${inputs.frontendState.i18nClient.get.AppInternalAdmin.internalAdminHeader}</h1>
                <${AppTabs.assign({
                    frontendState: inputs.frontendState,
                    tabs: internalAdminTabs,
                    withPadding: true,
                })}></${AppTabs}>
            </${AppPage}>
        `;
    },
});
