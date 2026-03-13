import {assert, checkWrap} from '@augment-vir/assert';
import {addPx, applyBrand, getEnumValues, stringify} from '@augment-vir/common';
import {frontendPathTree, TeamFilter, type Team} from '@evir/common';
import {asyncProp, css, html, listen, mapAsyncValue, nothing} from 'element-vir';
import {setCssVarValue} from 'lit-css-vars';
import {extractPathTree, routeHasPaths} from 'spa-router-vir';
import {type FrontendState} from '../../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../../events/change-route.event.js';
import {
    AdminTeamReloadEvent,
    AdminTeamUpdateEvent,
    handleAdminTeamUpdateEvent,
} from '../../../events/internal-admin-events.js';
import {AppScrollList} from '../../common/app-scroll-list.element.js';
import {defineAppElement} from '../../common/define-app-element.js';
import {AppTeam} from '../settings/team/app-team.element.js';

const teamAdminPathTree =
    frontendPathTree.paths.children.app.children['internal-admin'].children.teams;
const defaultTeamFilter: TeamFilter = TeamFilter.Approved;

export const AppInternalAdminTeams = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
}>()({
    tagName: 'app-internal-admin-teams',
    cssVars: {
        'app-internal-admin-teams-scroll-list-top': '0px',
    },
    styles: ({cssVars}) => css`
        :host {
            display: flex;
        }

        .wrapper {
            display: flex;
            flex-grow: 1;
            gap: 32px;
        }

        ${AppScrollList} {
            height: calc(100vh - ${cssVars['app-internal-admin-teams-scroll-list-top'].value});
            min-height: 300px;

            max-width: 20%;
            width: 264px;
        }

        ${AppTeam} {
            flex-grow: 1;
        }
    `,
    state({inputs}) {
        return {
            teamList: asyncProp({
                async updateCallback({teamFilter}: {teamFilter: TeamFilter}) {
                    const {data, ok} = await inputs.frontendState.apiClient.endpoints[
                        '/internal-admin/team-list'
                    ].fetch({
                        requestData: {
                            teamFilter,
                        },
                    });
                    if (!ok) {
                        throw new Error(stringify(data));
                    }

                    return data;
                },
            }),
        };
    },
    render({inputs, state, host, cssVars, dispatch}) {
        setCssVarValue({
            forCssVar: cssVars['app-internal-admin-teams-scroll-list-top'],
            onElement: host,
            toValue: addPx(host.offsetTop + 100),
        });

        if (!routeHasPaths(inputs.frontendState.currentRoute, teamAdminPathTree)) {
            return nothing;
        }
        assert.tsType(inputs.frontendState.currentRoute.paths[1]).equals<'internal-admin'>();
        assert.tsType(inputs.frontendState.currentRoute.paths[2]).equals<'teams'>();
        const rawTeamFilter = inputs.frontendState.currentRoute.paths[3];
        assert
            .tsType(inputs.frontendState.currentRoute.paths[4])
            .equals<'team' | 'create' | undefined>();
        const isCreatingTeam = inputs.frontendState.currentRoute.paths[4] === 'create';
        const rawSelectedTeamId = inputs.frontendState.currentRoute.paths[5];
        const selectedTeamTab = inputs.frontendState.currentRoute.paths[6];

        const routeTeamFilter: TeamFilter | undefined = checkWrap.isEnumValue(
            rawTeamFilter,
            TeamFilter,
        );
        if (!routeTeamFilter) {
            dispatch(
                new ChangeRouteEvent({
                    paths: teamAdminPathTree.children[':team-filter'].fill(defaultTeamFilter)
                        .fullPaths,
                }),
            );
        }

        const teamFilter: TeamFilter = routeTeamFilter || defaultTeamFilter;

        const selectedTeamId = applyBrand<Team['id']>(rawSelectedTeamId);

        const selectedTeam =
            (selectedTeamId &&
                checkWrap
                    .isArray(state.teamList.value)
                    ?.find(({team}) => team.id === selectedTeamId)) ||
            undefined;

        state.teamList.update({
            teamFilter,
        });

        const filterLabels: Record<TeamFilter, string> = {
            [TeamFilter.Approved]: inputs.frontendState.i18nClient.get.teamFilter.approved,
            [TeamFilter.NotApproved]: inputs.frontendState.i18nClient.get.teamFilter.notApproved,
            [TeamFilter.Admin]: inputs.frontendState.i18nClient.get.teamFilter.admin,
            [TeamFilter.Test]: inputs.frontendState.i18nClient.get.teamFilter.test,
            [TeamFilter.Active]: inputs.frontendState.i18nClient.get.teamFilter.active,
            [TeamFilter.Deactivated]: inputs.frontendState.i18nClient.get.teamFilter.deactivated,
        };

        return html`
            <div
                class="wrapper"
                ${listen(AdminTeamUpdateEvent, (event) => {
                    handleAdminTeamUpdateEvent(state.teamList, event.detail);
                })}
                ${listen(AdminTeamReloadEvent, async (event) => {
                    state.teamList.forceUpdate();
                    await state.teamList.value;

                    const currentTeamFilterPathTree = extractPathTree(
                        inputs.frontendState.currentRoute.paths,
                        frontendPathTree,
                        frontendPathTree.paths.children.app.children['internal-admin'].children
                            .teams.children[':team-filter'],
                    );

                    const currentUsersPathTree = extractPathTree(
                        inputs.frontendState.currentRoute.paths,
                        frontendPathTree,
                        frontendPathTree.paths.children.app.children['internal-admin'].children
                            .teams.children[':team-filter'].children.team.children[':team-id']
                            .children.users,
                    );

                    if (event.detail?.newUserId && currentUsersPathTree) {
                        dispatch(
                            new ChangeRouteEvent({
                                paths: currentUsersPathTree.children.user.children[':user-id'].fill(
                                    event.detail.newUserId,
                                ).fullPaths,
                            }),
                        );
                    } else if (event.detail?.newTeam && currentTeamFilterPathTree) {
                        dispatch(
                            new ChangeRouteEvent({
                                paths: frontendPathTree.paths.children.app.children[
                                    'internal-admin'
                                ].children.teams.children[':team-filter']
                                    .fill(event.detail.newTeam.teamFilter)
                                    .children.team.children[':team-id'].fill(
                                        event.detail.newTeam.newTeamId,
                                    ).children.details.fullPaths,
                            }),
                        );
                    }
                })}
            >
                <${AppScrollList.assign({
                    frontendState: inputs.frontendState,
                    topButton: {
                        text: inputs.frontendState.i18nClient.get.AppInternalAdminTeams
                            .createTeamButtonText,
                        disabled: isCreatingTeam,
                    },
                    options: mapAsyncValue(state.teamList.value, (teamList) => {
                        return teamList.map(({team, users}) => {
                            return {
                                label: team.teamName,
                                value: team.id,
                                subLabels: [
                                    {
                                        subLabel:
                                            users.length === 1
                                                ? inputs.frontendState.i18nClient.get.AppInternalAdminTeams.userCount(
                                                      {
                                                          count: users.length,
                                                      },
                                                  )
                                                : inputs.frontendState.i18nClient.get.AppInternalAdminTeams.userCountPlural(
                                                      {
                                                          count: users.length,
                                                      },
                                                  ),
                                        omitFromSearch: true,
                                    },
                                ],
                            };
                        });
                    }),
                    selectedValue: selectedTeamId,
                    filterOptions: getEnumValues(TeamFilter)
                        .sort()
                        .map((teamFilter) => {
                            return {
                                label: filterLabels[teamFilter],
                                value: teamFilter,
                            };
                        }),
                    filterValue: teamFilter,
                })}
                    ${listen(AppScrollList.events.filterValueChange, (event) => {
                        dispatch(
                            new ChangeRouteEvent({
                                paths: teamAdminPathTree.children[':team-filter'].fill(event.detail)
                                    .fullPaths,
                            }),
                        );
                    })}
                    ${listen(AppScrollList.events.topButtonClick, () => {
                        dispatch(
                            new ChangeRouteEvent({
                                paths: teamAdminPathTree.children[':team-filter'].fill(teamFilter)
                                    .children.create.fullPaths,
                            }),
                        );
                    })}
                    ${listen(AppScrollList.events.valueChange, (event) => {
                        const teamTab = selectedTeamTab || 'details';

                        const nextPaths = event.detail
                            ? teamAdminPathTree.children[':team-filter']
                                  .fill(teamFilter)
                                  .children.team.children[':team-id'].fill(event.detail).children[
                                  teamTab
                              ].fullPaths
                            : teamAdminPathTree.fullPaths;

                        dispatch(
                            new ChangeRouteEvent({
                                paths: nextPaths,
                            }),
                        );
                    })}
                ></${AppScrollList}>
                <${AppTeam.assign({
                    frontendState: inputs.frontendState,
                    allowAdmin: true,
                    selectedTeamData: selectedTeam,
                    showTabs: true,
                })}></${AppTeam}>
            </div>
        `;
    },
});
