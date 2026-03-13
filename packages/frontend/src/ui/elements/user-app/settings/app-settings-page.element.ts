import {stringify} from '@augment-vir/common';
import {frontendPathTree, type Team, type User} from '@evir/common';
import {asyncProp, css, html} from 'element-vir';
import {noNativeSpacing} from 'vira';
import {type FrontendState} from '../../../../data/frontend-state/frontend-state.js';
import {contentWidthCss} from '../../../styles/content-width.js';
import {appCssVars} from '../../../styles/css-vars.js';
import {AppPage} from '../../common/app-page.element.js';
import {type AppTab, AppTabs} from '../../common/app-tabs.element.js';
import {defineAppElement} from '../../common/define-app-element.js';
import {AppTeamUsers} from './team/app-team-users.element.js';
import {AppTeam} from './team/app-team.element.js';
import {AppUserSettings} from './user-settings/app-user-settings.element.js';

const settingsPathTree = frontendPathTree.paths.children.app.children['settings'];

export const AppSettingsPage = defineAppElement<
    Readonly<{
        frontendState: Readonly<FrontendState<(typeof settingsPathTree)['PathsType'], true>>;
    }>
>()({
    tagName: 'app-settings-page',
    styles: css`
        :host {
            ${contentWidthCss}
            display: flex;
            flex-direction: column;
        }

        ${AppPage} {
            padding-left: 0;
            padding-right: 0;
            padding-top: 0;
        }

        h1 {
            ${noNativeSpacing};
            margin: ${appCssVars['app-page-padding'].value};
            margin-bottom: ${appCssVars['app-content-padding'].value};
        }
    `,
    state({inputs}) {
        return {
            teamData: asyncProp({
                async updateCallback(
                    /**
                     * Not actually used, but intentionally present to force updates when the user
                     * id or selected team changes.
                     */
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    params: Readonly<{
                        userId: User['id'];
                        selectedTeamId: Team['id'] | undefined;
                    }>,
                ) {
                    const {ok, data} =
                        await inputs.frontendState.apiClient.endpoints['/team/get'].fetch();

                    if (ok) {
                        return data as typeof data | undefined;
                    } else {
                        throw new Error(stringify(data));
                    }
                },
            }),
        };
    },
    render({inputs, state}) {
        if (inputs.frontendState.user.isInternalAdmin) {
            state.teamData.setValue(undefined);
        } else {
            state.teamData.update({
                userId: inputs.frontendState.user.id,
                selectedTeamId: inputs.frontendState.user.selectedTeam?.team.id,
            });
        }

        const settingsTabs: ReadonlyArray<Readonly<AppTab>> = [
            {
                tabContent: inputs.frontendState.i18nClient.get.AppSettingsPage.tabs.user,
                pageContent: html`
                    <${AppUserSettings.assign({
                        frontendState: inputs.frontendState,
                    })}></${AppUserSettings}>
                `,
                paths: settingsPathTree.children.user,
            },
            {
                tabContent: inputs.frontendState.i18nClient.get.AppSettingsPage.tabs.team,
                pageContent: html`
                    <${AppTeam.assign({
                        frontendState: inputs.frontendState,
                        allowAdmin: false,
                        selectedTeamData: state.teamData.value,
                        showTabs: false,
                    })}></${AppTeam}>
                `,
                paths: settingsPathTree.children.team.children.details,
                isHidden: !!inputs.frontendState.user.isInternalAdmin,
            },
            {
                tabContent: inputs.frontendState.i18nClient.get.AppSettingsPage.tabs.members,
                pageContent: html`
                    <${AppTeamUsers.assign({
                        frontendState: inputs.frontendState,
                        allowAdmin: false,
                        selectedTeamData: state.teamData.value,
                    })}></${AppTeamUsers}>
                `,
                paths: settingsPathTree.children.team.children.users,
                isHidden: !!inputs.frontendState.user.isInternalAdmin,
            },
        ];

        return html`
            <${AppPage}>
                <h1>${inputs.frontendState.i18nClient.get.AppSettingsPage.settingsHeader}</h1>
                <${AppTabs.assign({
                    frontendState: inputs.frontendState,
                    tabs: settingsTabs,
                    withPadding: true,
                })}></${AppTabs}>
            </${AppPage}>
        `;
    },
});
