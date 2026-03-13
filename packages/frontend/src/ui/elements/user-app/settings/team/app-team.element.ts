import {combineErrorMessages} from '@augment-vir/common';
import {colorCss} from '@electrovir/color';
import {frontendPathTree} from '@evir/common';
import {css, html, nothing, type AsyncValue} from 'element-vir';
import {extractPathTree} from 'spa-router-vir';
import {noNativeSpacing, ViraEmphasis, ViraError, ViraTag} from 'vira';
import {type FrontendState} from '../../../../../data/frontend-state/frontend-state.js';
import {type TeamData} from '../../../../../data/team-data.js';
import {ChangeRouteEvent} from '../../../../events/change-route.event.js';
import {appColors} from '../../../../styles/color-theme.js';
import {appFont} from '../../../../styles/font.js';
import {AppLoader} from '../../../common/app-loader.element.js';
import {AppTabs} from '../../../common/app-tabs.element.js';
import {AppTeamSelect} from '../../../common/app-team-select.element.js';
import {defineAppElement} from '../../../common/define-app-element.js';
import {AppTeamDetails} from './app-team-details.element.js';
import {AppTeamUsers} from './app-team-users.element.js';

export const AppTeam = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
    selectedTeamData: AsyncValue<Readonly<TeamData> | undefined>;
    allowAdmin: boolean;
    showTabs: boolean;
}>()({
    tagName: 'app-team',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        p,
        h2 {
            ${noNativeSpacing}
        }

        h2 {
            ${appFont.h2}
        }

        .tags {
            padding: 4px;
            ${appFont.smallBody}
        }

        .select-team {
            flex-grow: 1;
            display: flex;
            justify-content: center;
            margin: 16px 0;
            ${colorCss(appColors.colors['app-body-secondary'])}
        }

        ${AppTabs} {
            flex-grow: 1;
        }
    `,
    render({inputs, dispatch}) {
        if (
            !inputs.frontendState.user.isInternalAdmin &&
            !inputs.frontendState.user.selectedTeam?.canEditTeamDetails
        ) {
            return nothing;
        } else if (inputs.selectedTeamData instanceof Promise) {
            return html`
                <${AppLoader}></${AppLoader}>
            `;
        } else if (inputs.selectedTeamData instanceof Error) {
            return html`
                <${ViraError}>
                    ${combineErrorMessages(
                        inputs.frontendState.i18nClient.get.AppTeam.failedToLoadTeam,
                        inputs.selectedTeamData,
                    )}
                </${ViraError}>
            `;
        }

        if (inputs.selectedTeamData) {
            const currentPathTree =
                extractPathTree(
                    inputs.frontendState.currentRoute.paths,
                    frontendPathTree,
                    frontendPathTree.paths.children.app.children['internal-admin'].children.teams
                        .children[':team-filter'].children.team.children[':team-id'],
                ) ||
                extractPathTree(
                    inputs.frontendState.currentRoute.paths,
                    frontendPathTree,
                    frontendPathTree.paths.children.app.children.settings.children.team,
                );
            if (!currentPathTree) {
                throw new Error('No team element path match.');
            }

            const tagTemplates = [
                {
                    text: inputs.frontendState.i18nClient.get.AppTeam.tags.approved,
                    enabled: inputs.selectedTeamData.team.isTeamApprovedByAdmin,
                },
                {
                    text: inputs.frontendState.i18nClient.get.AppTeam.tags.test,
                    enabled: inputs.selectedTeamData.team.isTestTeam,
                },
                {
                    text: inputs.frontendState.i18nClient.get.AppTeam.tags.admin,
                    enabled: inputs.selectedTeamData.team.isInternalAdminTeam,
                },
            ].map((tagDetails) => {
                if (!tagDetails.enabled) {
                    return nothing;
                }

                return html`
                    <${ViraTag.assign({
                        text: tagDetails.text,
                        emphasis: ViraEmphasis.Subtle,
                    })}></${ViraTag}>
                `;
            });
            const tagsTemplate = inputs.allowAdmin
                ? html`
                      <div class="tags">${tagTemplates}</div>
                  `
                : nothing;

            const tabsTemplate = inputs.showTabs
                ? html`
                      <${AppTabs.assign({
                          frontendState: inputs.frontendState,
                          tabs: [
                              {
                                  tabContent:
                                      inputs.frontendState.i18nClient.get.AppTeam.tabs.details,
                                  pageContent: html`
                                      <${AppTeamDetails.assign({
                                          frontendState: inputs.frontendState,
                                          allowAdmin: inputs.allowAdmin,
                                          selectedTeamData: inputs.selectedTeamData,
                                      })}></${AppTeamDetails}>
                                  `,
                                  paths: currentPathTree.children.details,
                              },
                              {
                                  tabContent:
                                      inputs.frontendState.i18nClient.get.AppTeam.tabs.users,
                                  pageContent: html`
                                      <${AppTeamUsers.assign({
                                          frontendState: inputs.frontendState,
                                          allowAdmin: inputs.allowAdmin,
                                          selectedTeamData: inputs.selectedTeamData,
                                      })}></${AppTeamUsers}>
                                  `,
                                  paths: currentPathTree.children.users,
                              },
                          ],
                          withPadding: false,
                      })}></${AppTabs}>
                  `
                : html`
                      <${AppTeamDetails.assign({
                          frontendState: inputs.frontendState,
                          allowAdmin: inputs.allowAdmin,
                          selectedTeamData: inputs.selectedTeamData,
                      })}></${AppTeamDetails}>
                  `;

            return html`
                <h2 class="team-header">
                    ${inputs.frontendState.i18nClient.get.AppTeam.teamHeader}
                    <${AppTeamSelect.assign({
                        frontendState: inputs.frontendState,
                    })}>
                        ${inputs.selectedTeamData.team.teamName}
                    </${AppTeamSelect}>
                </h2>
                ${tagsTemplate} ${tabsTemplate}
            `;
        } else if (inputs.allowAdmin) {
            const isCreatingNewTeam =
                inputs.frontendState.currentRoute.paths.at(-1) ===
                frontendPathTree.paths.children.app.children['internal-admin'].children.teams
                    .children[':team-filter'].children.create.path;

            if (isCreatingNewTeam) {
                return html`
                    <h2>${inputs.frontendState.i18nClient.get.AppTeam.newTeam}</h2>
                    <${AppTeamDetails.assign({
                        frontendState: inputs.frontendState,
                        allowAdmin: true,
                        selectedTeamData: undefined,
                    })}></${AppTeamDetails}>
                `;
            } else {
                return html`
                    <p class="select-team">
                        ${inputs.frontendState.i18nClient.get.AppTeam.selectATeam}
                    </p>
                `;
            }
        } else {
            dispatch(
                new ChangeRouteEvent({
                    paths: frontendPathTree.paths.children.app.children.settings.children.user
                        .fullPaths,
                }),
            );
            return nothing;
        }
    },
});
