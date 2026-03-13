import {assertWrap, check} from '@augment-vir/assert';
import {
    type ArrayElement,
    combineErrorMessages,
    ensureErrorAndPrependMessage,
    extractErrorMessage,
    mapObjectValues,
    omitObjectKeys,
    removeNullishValues,
    stringify,
} from '@augment-vir/common';
import {colorCss} from '@electrovir/color';
import {type BackendService, frontendPathTree, teamPermissionSelection} from '@evir/common';
import {css, html, listen, listenToEnter, nothing} from 'element-vir';
import {handleError} from 'sentry-vir';
import {extractPathTree} from 'spa-router-vir';
import {type RequireExactlyOne, type SetOptional} from 'type-fest';
import {
    areFormFieldsValid,
    LoaderAnimated24Icon,
    noNativeSpacing,
    ViraButton,
    ViraColorVariant,
    ViraError,
    ViraForm,
    type ViraFormField,
    type ViraFormFields,
    ViraFormFieldType,
} from 'vira';
import {type FrontendState} from '../../../../../data/frontend-state/frontend-state.js';
import {type TeamData} from '../../../../../data/team-data.js';
import {getUserPermissionLabel} from '../../../../../data/user-permission-label.js';
import {ChangeRouteEvent} from '../../../../events/change-route.event.js';
import {
    AdminTeamReloadEvent,
    AdminTeamUpdateEvent,
} from '../../../../events/internal-admin-events.js';
import {appColors} from '../../../../styles/color-theme.js';
import {defineAppElement} from '../../../common/define-app-element.js';

enum LoadingState {
    Deactivate = 'deactivate',
    Resending = 'resending',
    Saving = 'saving',
    AssumingIdentity = 'assuming-identity',
    Unlocking = 'unlocking',
}

type UserEdits = Omit<
    BackendService['endpoints']['/user/edit']['RequestType'],
    'userId' | 'teamId'
>;

const defaultUserFields: Required<UserEdits> = {
    emailAddress: '',
    humanName: '',
    isInternalAdmin: false,
    isTestUser: false,
    ...teamPermissionSelection,
};

export const AppTeamUser = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
    teamData: Readonly<TeamData>;
    user: Readonly<
        RequireExactlyOne<{
            isCreatingUser: true;
            selectedUser: Readonly<ArrayElement<TeamData['users']>> | undefined;
        }>
    >;
    allowAdmin: boolean;
}>()({
    tagName: 'app-team-user',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 64px;
            padding: 16px;
            max-width: 100%;
        }

        section {
            display: flex;
            flex-direction: column;
            gap: 32px;
            max-width: 100%;
        }

        h3,
        p {
            ${noNativeSpacing}
        }

        ${ViraForm} {
            width: 400px;
            max-width: 100%;
        }

        ${ViraButton} {
            align-self: start;
        }

        .select-a-user {
            flex-grow: 1;
            display: flex;
            justify-content: center;
            margin: 16px 0;
            ${colorCss(appColors.colors['app-body-secondary'])}
        }
    `,
    state() {
        return {
            userEdits: undefined as UserEdits | undefined,
            loadingState: undefined as LoadingState | undefined,
            error: undefined as string | undefined,
            inviteSent: false,
        };
    },
    render({inputs, state, updateState, dispatch}) {
        if (!inputs.user.isCreatingUser && !inputs.user.selectedUser) {
            return html`
                <p class="select-a-user">
                    ${inputs.frontendState.i18nClient.get.AppTeamUser.selectUser}
                </p>
            `;
        }

        async function saveUser() {
            if (!state.userEdits || !canSave || state.loadingState) {
                return;
            }
            try {
                updateState({
                    loadingState: LoadingState.Saving,
                    error: undefined,
                });
                const {ok, data} = selectedUser
                    ? await inputs.frontendState.apiClient.endpoints['/user/edit'].fetch({
                          requestData: {
                              ...state.userEdits,
                              userId: selectedUser.id,
                              teamId: inputs.teamData.team.id,
                          },
                      })
                    : await inputs.frontendState.apiClient.endpoints['/user/invite'].fetch({
                          requestData: {
                              emailAddress: assertWrap.isTruthy(
                                  userWithEdits.emailAddress,
                                  'Invalid email address',
                              ),
                              teamId: inputs.teamData.team.id,
                          },
                      });

                if (!ok) {
                    throw new Error(stringify(data));
                }

                if (selectedUser) {
                    dispatch(
                        new AdminTeamUpdateEvent({
                            userId: selectedUser.id,
                            userUpdate: removeNullishValues(state.userEdits),
                        }),
                    );
                } else {
                    dispatch(
                        new AdminTeamReloadEvent({
                            newUserId: data?.id,
                        }),
                    );
                }
                updateState({
                    userEdits: undefined,
                });
            } catch (error) {
                updateState({
                    error: combineErrorMessages(
                        inputs.frontendState.i18nClient.get.AppTeamUser.failedToSave,
                        error,
                    ),
                });
            } finally {
                updateState({
                    loadingState: undefined,
                });
            }
        }

        const currentUsersRoute =
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

        if (!currentUsersRoute) {
            throw new Error('No path match.');
        }

        const selectedUser = inputs.user.selectedUser;

        const userWithEdits: Required<UserEdits> = {
            ...defaultUserFields,
            ...(selectedUser ? omitObjectKeys(selectedUser, ['id']) : {}),
            ...state.userEdits,
        };

        const formFields = {
            humanName: {
                label: inputs.frontendState.i18nClient.get.AppTeamUser.nameLabel,
                type: ViraFormFieldType.Text,
                value: userWithEdits.humanName || '',
                isRequired: true,
                isHidden: inputs.user.isCreatingUser,
            },
            emailAddress: {
                label: inputs.frontendState.i18nClient.get.AppTeamUser.emailAddressLabel,
                type: ViraFormFieldType.Text,
                value: userWithEdits.emailAddress || '',
                isRequired: true,
            },
            isInternalAdmin: {
                label: inputs.frontendState.i18nClient.get.AppTeamUser.isAdminLabel,
                type: ViraFormFieldType.Checkbox,
                value: userWithEdits.isInternalAdmin || false,
                isHidden:
                    inputs.user.isCreatingUser ||
                    !inputs.allowAdmin ||
                    !inputs.teamData.team.isInternalAdminTeam,
            },
            isTestUser: {
                label: inputs.frontendState.i18nClient.get.AppTeamUser.isTestUserLabel,
                type: ViraFormFieldType.Checkbox,
                value: userWithEdits.isTestUser || false,
                isHidden: inputs.user.isCreatingUser || !inputs.allowAdmin,
            },
            ...mapObjectValues(teamPermissionSelection, (permissionKey): ViraFormField => {
                return {
                    label: getUserPermissionLabel(inputs.frontendState.i18nClient, permissionKey),
                    type: ViraFormFieldType.Checkbox,
                    value: userWithEdits.canManageUsers ?? true,
                    isHidden: inputs.user.isCreatingUser,
                };
            }),
        } satisfies ViraFormFields satisfies SetOptional<
            Record<keyof typeof userWithEdits | 'password', ViraFormField>,
            'password'
        >;

        const canSave = !!(
            state.userEdits &&
            Object.keys(state.userEdits).length &&
            areFormFieldsValid(formFields)
        );

        const heading = selectedUser
            ? inputs.frontendState.i18nClient.get.AppTeamUser.userHeading({
                  name: selectedUser.humanName,
                  email: selectedUser.emailAddress,
              })
            : inputs.frontendState.i18nClient.get.AppTeamUser.newUserHeading;

        const resendInviteTemplate =
            !inputs.allowAdmin || selectedUser?.accountVerifiedAt || inputs.user.isCreatingUser
                ? nothing
                : html`
                      <div>
                          <p>${inputs.frontendState.i18nClient.get.AppTeamUser.userIsInvited}</p>
                          <${ViraButton.assign({
                              text: inputs.frontendState.i18nClient.get.AppTeamUser.resendInvite,
                              colorVariant: ViraColorVariant.Neutral,
                              isDisabled: !!state.loadingState,
                              icon:
                                  state.loadingState === LoadingState.Resending
                                      ? LoaderAnimated24Icon
                                      : undefined,
                          })}
                              ${listen('click', async () => {
                                  if (!selectedUser) {
                                      return;
                                  }

                                  try {
                                      if (!inputs.allowAdmin) {
                                          throw new Error(
                                              'Cannot resend email invites without admin access.',
                                          );
                                      }
                                      updateState({
                                          loadingState: LoadingState.Resending,
                                          error: undefined,
                                      });

                                      const {ok, data} =
                                          await inputs.frontendState.apiClient.endpoints[
                                              '/internal-admin/resend-invite'
                                          ].fetch({
                                              requestData: {
                                                  userId: selectedUser.id,
                                                  teamId: inputs.teamData.team.id,
                                              },
                                          });

                                      if (!ok) {
                                          throw new Error(stringify(data));
                                      }
                                  } catch (caught) {
                                      const error = ensureErrorAndPrependMessage(
                                          caught,
                                          inputs.frontendState.i18nClient.get.AppTeamUser
                                              .failedToResendInvite,
                                      );
                                      handleError(error, {
                                          context: {
                                              user: selectedUser.id,
                                              team: inputs.teamData,
                                          },
                                          tags: {
                                              userId: selectedUser.id,
                                              teamId: inputs.teamData.team.id,
                                          },
                                      });
                                      updateState({
                                          error: extractErrorMessage(error),
                                      });
                                  } finally {
                                      updateState({
                                          loadingState: undefined,
                                      });
                                  }
                              })}
                          ></${ViraButton}>
                      </div>
                  `;

        return html`
            <section>
                ${state.error
                    ? html`
                          <${ViraError}>
                              ${combineErrorMessages(
                                  inputs.frontendState.i18nClient.get.AppTeamUser.error,
                                  state.error,
                              )}
                          </${ViraError}>
                      `
                    : nothing}

                <h3>${heading}</h3>
                ${selectedUser
                    ? html`
                          <${ViraButton.assign({
                              colorVariant: ViraColorVariant.Neutral,
                              text: inputs.frontendState.i18nClient.get.AppTeamUser
                                  .assumeIdentityButton,
                          })}
                              class="assume-identity"
                              ${listen('click', async () => {
                                  try {
                                      updateState({
                                          loadingState: LoadingState.AssumingIdentity,
                                      });
                                      await inputs.frontendState.frontendAuthClient.assumeUser({
                                          teamId: inputs.teamData.team.id,
                                          userId: selectedUser.id,
                                      });

                                      // Reload the app state by reloading the page
                                      window.location.reload();
                                  } catch (error) {
                                      updateState({
                                          error: combineErrorMessages(
                                              inputs.frontendState.i18nClient.get.AppTeamUser
                                                  .failedToAssumeIdentity,
                                              error,
                                          ),
                                      });
                                  } finally {
                                      updateState({
                                          loadingState: undefined,
                                      });
                                  }
                              })}
                          ></${ViraButton}>
                      `
                    : nothing}
                ${resendInviteTemplate}
                ${selectedUser?.accountLockedAt && inputs.allowAdmin
                    ? html`
                          <div>
                              <p>${inputs.frontendState.i18nClient.get.AppTeamUser.userIsLocked}</p>
                              <${ViraButton.assign({
                                  text: inputs.frontendState.i18nClient.get.AppTeamUser.unlockUser,
                                  colorVariant: ViraColorVariant.Neutral,
                                  isDisabled: !!state.loadingState,
                                  icon:
                                      state.loadingState === LoadingState.Unlocking
                                          ? LoaderAnimated24Icon
                                          : undefined,
                              })}
                                  ${listen('click', async () => {
                                      if (
                                          !globalThis.confirm(
                                              inputs.frontendState.i18nClient.get.AppTeamUser.confirmUnlockUser(
                                                  {
                                                      name: selectedUser.humanName,
                                                  },
                                              ),
                                          )
                                      ) {
                                          return;
                                      }

                                      try {
                                          if (!inputs.allowAdmin) {
                                              throw new Error(
                                                  'Cannot unlock user without admin access',
                                              );
                                          }

                                          updateState({
                                              loadingState: LoadingState.Unlocking,
                                              error: undefined,
                                          });

                                          const {ok, data} =
                                              await inputs.frontendState.apiClient.endpoints[
                                                  '/internal-admin/unlock-user'
                                              ].fetch({
                                                  requestData: {
                                                      id: selectedUser.id,
                                                  },
                                              });

                                          if (!ok) {
                                              throw new Error(stringify(data));
                                          }

                                          dispatch(new AdminTeamReloadEvent(undefined));
                                      } catch (caught) {
                                          const error = ensureErrorAndPrependMessage(
                                              caught,
                                              inputs.frontendState.i18nClient.get.AppTeamUser
                                                  .failedToUnlockUser,
                                          );
                                          handleError(error, {
                                              context: {
                                                  user: selectedUser.id,
                                                  team: inputs.teamData,
                                              },
                                              tags: {
                                                  userId: selectedUser.id,
                                                  teamId: inputs.teamData.team.id,
                                              },
                                          });
                                          updateState({
                                              error: extractErrorMessage(error),
                                          });
                                      } finally {
                                          updateState({
                                              loadingState: undefined,
                                          });
                                      }
                                  })}
                              ></${ViraButton}>
                          </div>
                      `
                    : nothing}
                <${ViraForm.assign({
                    fields: formFields,
                    isDisabled: !!state.loadingState,
                })}
                    ${listenToEnter(async () => {
                        await saveUser();
                    })}
                    ${listen(ViraForm.events.valueChange, (event) => {
                        if (!check.isKeyOf(event.detail.key, formFields)) {
                            return;
                        }

                        const isEqual = selectedUser
                            ? check.isBoolean(event.detail.value)
                                ? event.detail.value ===
                                  !!selectedUser[event.detail.key as keyof typeof selectedUser]
                                : (event.detail.value || '') ===
                                  (selectedUser[event.detail.key as keyof typeof selectedUser] ||
                                      '')
                            : false;

                        const newEdits = isEqual
                            ? omitObjectKeys(state.userEdits || {}, [event.detail.key])
                            : {
                                  ...state.userEdits,
                                  [event.detail.key]: event.detail.value,
                              };

                        if (Object.keys(newEdits).length) {
                            updateState({
                                userEdits: newEdits,
                            });
                        } else {
                            updateState({
                                userEdits: undefined,
                            });
                        }
                    })}
                >
                    <div class="buttons">
                        <${ViraButton.assign({
                            text: inputs.frontendState.i18nClient.get.AppTeamUser
                                .cancelUserEditsButtonText,
                            colorVariant: ViraColorVariant.Neutral,
                            isDisabled: (!!selectedUser && !canSave) || !!state.loadingState,
                        })}
                            ${listen('click', () => {
                                if (selectedUser) {
                                    updateState({
                                        userEdits: undefined,
                                        error: undefined,
                                    });
                                } else {
                                    dispatch(
                                        new ChangeRouteEvent({
                                            paths: currentUsersRoute.fullPaths,
                                        }),
                                    );
                                }
                            })}
                        ></${ViraButton}>
                        <${ViraButton.assign({
                            text: inputs.frontendState.i18nClient.get.AppTeamUser
                                .saveUserEditsButtonText,
                            isDisabled: !canSave || !!state.loadingState,
                            icon:
                                state.loadingState === LoadingState.Saving
                                    ? LoaderAnimated24Icon
                                    : undefined,
                        })}
                            ${listen('click', async () => {
                                await saveUser();
                            })}
                        ></${ViraButton}>
                    </div>
                </${ViraForm}>
            </section>
            ${selectedUser
                ? html`
                      <section>
                          <${ViraButton.assign({
                              text: inputs.frontendState.i18nClient.get.AppTeamUser
                                  .deactivateUserButtonText,
                              colorVariant: ViraColorVariant.Danger,
                              isDisabled: canSave || !!state.loadingState,
                              icon:
                                  state.loadingState === LoadingState.Deactivate
                                      ? LoaderAnimated24Icon
                                      : undefined,
                          })}
                              ${listen('click', async () => {
                                  if (
                                      state.userEdits ||
                                      state.loadingState ||
                                      !globalThis.confirm(
                                          inputs.frontendState.i18nClient.get.AppTeamUser.confirmDeactivateUser(
                                              {
                                                  name: selectedUser.humanName,
                                                  email: selectedUser.emailAddress,
                                              },
                                          ),
                                      )
                                  ) {
                                      return;
                                  }

                                  try {
                                      updateState({
                                          loadingState: LoadingState.Deactivate,
                                          error: undefined,
                                      });
                                      const {ok, data} =
                                          await inputs.frontendState.apiClient.endpoints[
                                              '/user/deactivate'
                                          ].fetch({
                                              requestData: {
                                                  userId: selectedUser.id,
                                                  teamId: inputs.teamData.team.id,
                                              },
                                          });

                                      if (!ok) {
                                          throw new Error(data);
                                      }

                                      dispatch(new AdminTeamReloadEvent(undefined));
                                      updateState({
                                          userEdits: undefined,
                                      });
                                  } catch (error) {
                                      updateState({
                                          error: combineErrorMessages(
                                              inputs.frontendState.i18nClient.get.AppTeamUser
                                                  .failedToDeactivateUser,
                                              error,
                                          ),
                                      });
                                  } finally {
                                      updateState({
                                          loadingState: undefined,
                                      });
                                  }
                              })}
                          ></${ViraButton}>
                      </section>
                  `
                : nothing}
        `;
    },
});
