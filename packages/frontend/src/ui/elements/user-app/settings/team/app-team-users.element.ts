import {check} from '@augment-vir/assert';
import {addPx, combineErrorMessages} from '@augment-vir/common';
import {frontendPathTree} from '@evir/common';
import {type AsyncValue, css, html, listen, nothing} from 'element-vir';
import {setCssVarValue} from 'lit-css-vars';
import {extractPathTree} from 'spa-router-vir';
import {ViraError} from 'vira';
import {type FrontendState} from '../../../../../data/frontend-state/frontend-state.js';
import {type TeamData} from '../../../../../data/team-data.js';
import {ChangeRouteEvent} from '../../../../events/change-route.event.js';
import {AppLoader} from '../../../common/app-loader.element.js';
import {AppScrollList, type ScrollListOption} from '../../../common/app-scroll-list.element.js';
import {defineAppElement} from '../../../common/define-app-element.js';
import {AppTeamUser} from './app-team-user.element.js';

export const AppTeamUsers = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
    selectedTeamData: AsyncValue<Readonly<TeamData> | undefined>;
    allowAdmin: boolean;
}>()({
    tagName: 'app-team-users',
    cssVars: {
        'app-team-users-scroll-list-top': '0px',
    },
    styles: ({cssVars}) => css`
        :host {
            display: flex;
            gap: 32px;
        }

        ${AppScrollList} {
            height: calc(100vh - ${cssVars['app-team-users-scroll-list-top'].value});
            min-height: 300px;
            max-width: 20%;
            width: 240px;
        }

        ${AppTeamUser} {
            flex-grow: 1;
        }
    `,
    render({inputs, dispatch, cssVars, host}) {
        if (
            (!inputs.frontendState.user.isInternalAdmin &&
                !inputs.frontendState.user.selectedTeam?.canManageUsers) ||
            !inputs.selectedTeamData
        ) {
            dispatch(
                new ChangeRouteEvent({
                    paths: [],
                    replace: true,
                }),
            );
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

        setCssVarValue({
            forCssVar: cssVars['app-team-users-scroll-list-top'],
            onElement: host,
            toValue: addPx(host.offsetTop + 100),
        });

        const currentTeamPathTree =
            extractPathTree(
                inputs.frontendState.currentRoute.paths,
                frontendPathTree,
                frontendPathTree.paths.children.app.children.settings.children.team.children.users,
            ) ||
            extractPathTree(
                inputs.frontendState.currentRoute.paths,
                frontendPathTree,
                frontendPathTree.paths.children.app.children['internal-admin'].children.teams
                    .children[':team-filter'].children.team.children[':team-id'].children.users,
            );

        if (!currentTeamPathTree) {
            dispatch(
                new ChangeRouteEvent({
                    paths: [],
                    replace: true,
                }),
            );
            return nothing;
        }

        const isCreatingUser =
            inputs.frontendState.currentRoute.paths.at(-1) ===
            frontendPathTree.paths.children.app.children.settings.children.team.children.users
                .children.create.path;
        const selectedUserId = isCreatingUser
            ? undefined
            : inputs.frontendState.currentRoute.paths.at(-1);
        const selectedUser = inputs.selectedTeamData.users.find(
            (user) => user.id === selectedUserId,
        );

        return html`
            <${AppScrollList.assign({
                ...inputs,
                topButton: {
                    text: inputs.frontendState.i18nClient.get.AppTeamUsers.inviteUserButtonText,
                    disabled: isCreatingUser,
                },
                options: inputs.selectedTeamData.users.map((user): ScrollListOption => {
                    return {
                        value: user.id,
                        label: user.humanName,
                        subLabels: [
                            {
                                subLabel: user.emailAddress,
                            },
                            user.accountLockedAt
                                ? {
                                      subLabel:
                                          inputs.frontendState.i18nClient.get.AppTeamUsers
                                              .lockedLabel,
                                  }
                                : undefined,
                        ].filter(check.isTruthy),
                    };
                }),
                selectedValue: selectedUserId,
            })}
                ${listen(AppScrollList.events.valueChange, (event) => {
                    const nextPaths = event.detail
                        ? currentTeamPathTree.children.user.children[':user-id'].fill(event.detail)
                              .fullPaths
                        : currentTeamPathTree.fullPaths;

                    dispatch(
                        new ChangeRouteEvent({
                            paths: nextPaths,
                        }),
                    );
                })}
                ${listen(AppScrollList.events.topButtonClick, () => {
                    dispatch(
                        new ChangeRouteEvent({
                            paths: currentTeamPathTree.children.create.fullPaths,
                        }),
                    );
                })}
            ></${AppScrollList}>
            <${AppTeamUser.assign({
                frontendState: inputs.frontendState,
                teamData: inputs.selectedTeamData,
                user: isCreatingUser
                    ? {
                          isCreatingUser,
                      }
                    : {
                          selectedUser,
                      },
                allowAdmin: inputs.allowAdmin,
            })}></${AppTeamUser}>
        `;
    },
});
