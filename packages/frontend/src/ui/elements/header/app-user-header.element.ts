import {check} from '@augment-vir/assert';
import {frontendPathTree, ScreenSize} from '@evir/common';
import {css, html, listen, nothing} from 'element-vir';
import {
    HorizontalAnchor,
    noNativeSpacing,
    renderMenuItemEntries,
    ViraLink,
    ViraMenuCornerStyle,
    ViraMenuTrigger,
    ViraModal,
    type ViraMenuItemEntry,
} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {LogoutEvent} from '../../events/logout.event.js';
import {appColors} from '../../styles/color-theme.js';
import {appFont} from '../../styles/font.js';
import {AppTeamSelect} from '../common/app-team-select.element.js';
import {AppThemeSwitcher} from '../common/app-theme-switcher.element.js';
import {AppUserAvatar} from '../common/app-user-avatar.element.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppFeedback} from './app-feedback.element.js';

export enum HeaderUserAction {
    Admin = 'admin',
    TeamSelect = 'team-select',
    Settings = 'settings',
    Theme = 'theme',
    Feedback = 'feedback',
    Logout = 'logout',
}

export const AppUserHeader = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
}>()({
    tagName: 'app-user-header',
    state() {
        return {
            feedbackModalTrigger: undefined as {startUrl: string} | undefined,
        };
    },
    hostClasses: {
        'app-user-header-phone-size': ({inputs}) =>
            inputs.frontendState.screenSize === ScreenSize.Phone,
    },
    styles: ({hostClasses}) => css`
        :host {
            max-width: 100%;
            display: inline-flex;
            box-sizing: border-box;
        }

        ${ViraMenuTrigger} {
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
        }

        .trigger-wrapper {
            max-width: 100%;
            display: flex;
            align-items: center;
            justify-content: flex-end;

            & ${AppUserAvatar} {
                ${appFont.largeBody}
                margin: 0 8px;
            }

            & .user-wrapper {
                max-width: 100%;
                display: flex;
                flex-direction: column;
                align-items: flex-start;

                & .user-name {
                    ${appFont.largeBody}
                    font-weight: bold;
                }

                & .team-name {
                    font-size: 13px;
                    color: ${appColors.colors['app-brand-primary'].foreground.value};
                }

                & .role-name {
                    font-size: 13px;
                    color: ${appColors.colors['app-body-secondary'].foreground.value};
                }
            }
        }

        p {
            ${noNativeSpacing};
        }
        ${ViraLink} {
            text-decoration: none;
        }

        ${AppTeamSelect} {
            margin-right: -2px;
            max-width: 300px;
        }

        ${hostClasses['app-user-header-phone-size'].selector} {
            & .user-wrapper {
                display: none;
            }

            & ${AppUserAvatar} {
                margin: 0;
            }
        }
    `,
    render({inputs, dispatch, state, updateState}) {
        const userName = inputs.frontendState.user.humanName;
        const userTeams = inputs.frontendState.user.teams;

        const headerUserMenuItems: ReadonlyArray<Readonly<ViraMenuItemEntry>> = (
            [
                userTeams.length > 1
                    ? {
                          content: html`
                              <${AppTeamSelect.assign({
                                  frontendState: inputs.frontendState,
                                  rawSelect: true,
                              })}
                                  ${listen('click', (event) => {
                                      event.stopPropagation();
                                  })}
                                  ${listen('mousedown', (event) => {
                                      event.stopPropagation();
                                  })}
                              ></${AppTeamSelect}>
                          `,
                      }
                    : undefined,

                inputs.frontendState.user.isInternalAdmin
                    ? {
                          content: html`
                              <${ViraLink.assign({
                                  disableLinkStyles: true,
                                  route: {
                                      router: inputs.frontendState.router,
                                      route: {
                                          paths: frontendPathTree.paths.children.app.children[
                                              'internal-admin'
                                          ].fullPaths,
                                      },
                                  },
                              })}>
                                  ${inputs.frontendState.i18nClient.get.AppUserHeader.adminLink}
                              </${ViraLink}>
                          `,
                      }
                    : undefined,
                inputs.frontendState.user.isApproved
                    ? {
                          content: html`
                              <${ViraLink.assign({
                                  disableLinkStyles: true,
                                  route: {
                                      router: inputs.frontendState.router,
                                      route: {
                                          paths: frontendPathTree.paths.children.app.children
                                              .settings.fullPaths,
                                      },
                                  },
                              })}>
                                  ${inputs.frontendState.i18nClient.get.AppUserHeader.settingsLink}
                              </${ViraLink}>
                          `,
                      }
                    : undefined,
                {
                    content: inputs.frontendState.i18nClient.get.AppUserHeader.feedbackButton,
                    onClick() {
                        updateState({
                            feedbackModalTrigger: {
                                startUrl: window.location.href,
                            },
                        });
                    },
                },
                {
                    disablePointerStyles: true,
                    content: html`
                        <${AppThemeSwitcher.assign({
                            frontendState: inputs.frontendState,
                            selectedTheme:
                                inputs.frontendState.localStorageClient.get.themeSelection(),
                        })}
                            ${listen('click', (event) => {
                                event.stopImmediatePropagation();
                            })}
                            ${listen('mousedown', (event) => {
                                event.stopImmediatePropagation();
                            })}
                        ></${AppThemeSwitcher}>
                    `,
                },
                {
                    content: inputs.frontendState.i18nClient.get.AppUserHeader.logoutButton,
                    onClick() {
                        dispatch(new LogoutEvent());
                    },
                },
            ] satisfies ReadonlyArray<Readonly<ViraMenuItemEntry> | undefined>
        ).filter(check.isTruthy);

        const roleTemplate = inputs.frontendState.user.isInternalAdmin
            ? html`
                  <p class="role-name">
                      ${inputs.frontendState.i18nClient.get.AppUserHeader.isAdminSubtitle}
                  </p>
              `
            : nothing;

        const selectedTeamName = inputs.frontendState.user.selectedTeam?.team.teamName;

        return html`
            <${ViraMenuTrigger.assign({
                menuCornerStyle: ViraMenuCornerStyle.AllRounded,
                popUpOffset: {
                    vertical: 4,
                },
                horizontalAnchor: HorizontalAnchor.Right,
            })}>
                <div class="trigger-wrapper" slot=${ViraMenuTrigger.slotNames.trigger}>
                    <${AppUserAvatar.assign({
                        userName,
                    })}></${AppUserAvatar}>
                    <div class="user-wrapper">
                        ${selectedTeamName
                            ? html`
                                  <p class="team-name">${selectedTeamName}</p>
                              `
                            : nothing}
                        <p class="user-name">${userName}</p>
                        ${roleTemplate}
                    </div>
                </div>
                ${renderMenuItemEntries(headerUserMenuItems)}
            </${ViraMenuTrigger}>

            <${ViraModal.assign({
                open: !!state.feedbackModalTrigger,
                isMobileSize: inputs.frontendState.screenSize === ScreenSize.Phone,
                modalTitle: inputs.frontendState.i18nClient.get.AppUserHeader.feedbackModalHeader,
            })}
                ${listen(ViraModal.events.modalClose, () => {
                    updateState({
                        feedbackModalTrigger: undefined,
                    });
                })}
            >
                ${state.feedbackModalTrigger
                    ? html`
                          <${AppFeedback.assign({
                              ...inputs,
                              startUrl: state.feedbackModalTrigger.startUrl,
                          })}
                              ${listen(AppFeedback.events.closeFeedback, () => {
                                  updateState({
                                      feedbackModalTrigger: undefined,
                                  });
                              })}
                          ></${AppFeedback}>
                      `
                    : nothing}
            </${ViraModal}>
        `;
    },
});
