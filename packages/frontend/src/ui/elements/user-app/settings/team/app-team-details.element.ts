import {check} from '@augment-vir/assert';
import {
    combineErrorMessages,
    omitObjectKeys,
    selectFrom,
    stringify,
    type SelectFrom,
} from '@augment-vir/common';
import {frontendPathTree, TeamFilter, type Team} from '@evir/common';
import {css, html, listen, nothing} from 'element-vir';
import {
    areFormFieldsValid,
    LoaderAnimated24Icon,
    ViraButton,
    ViraColorVariant,
    ViraError,
    ViraForm,
    ViraFormFieldType,
    type ViraFormField,
    type ViraFormFields,
} from 'vira';
import {type FrontendState} from '../../../../../data/frontend-state/frontend-state.js';
import {type AdminTeamData, type TeamData} from '../../../../../data/team-data.js';
import {ChangeRouteEvent} from '../../../../events/change-route.event.js';
import {
    AdminTeamReloadEvent,
    AdminTeamUpdateEvent,
} from '../../../../events/internal-admin-events.js';
import {defineAppElement} from '../../../common/define-app-element.js';

enum LoadingState {
    Deactivate = 'deactivate',
    Saving = 'saving',
}

const defaultTeamFields: Omit<AdminTeamData['team'], 'id'> = {
    isTeamApprovedByAdmin: true,
    isTestTeam: false,
    teamName: '',
    deactivatedAt: null,
    isInternalAdminTeam: false,
};

export const AppTeamDetails = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
    selectedTeamData: Readonly<TeamData> | undefined;
    allowAdmin: boolean;
}>()({
    tagName: 'app-team-details',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 64px;
            padding: 16px;
            width: 400px;
            max-width: 100%;
        }

        .deactivate-button {
            align-self: start;
        }
    `,
    state() {
        return {
            teamEdits: undefined as
                | Partial<
                      SelectFrom<
                          Team,
                          {
                              teamName: true;
                              isTeamApprovedByAdmin: true;
                              isTestTeam: true;
                              isInternalAdminTeam: true;
                          }
                      >
                  >
                | undefined,
            loadingState: undefined as LoadingState | undefined,
            error: undefined as string | undefined,
        };
    },
    render({inputs, state, updateState, dispatch}) {
        const selectedTeamData = inputs.selectedTeamData;

        const teamWithEdits: Omit<AdminTeamData['team'], 'id'> = {
            ...defaultTeamFields,
            ...(selectedTeamData ? omitObjectKeys(selectedTeamData.team, ['id']) : {}),
            ...state.teamEdits,
        };

        const formFields = {
            teamName: {
                label: inputs.frontendState.i18nClient.get.AppTeamDetails.teamNameLabel,
                type: ViraFormFieldType.Text,
                value: teamWithEdits.teamName,
                isRequired: true,
            },
            isTeamApprovedByAdmin: {
                label: inputs.frontendState.i18nClient.get.AppTeamDetails.isApprovedLabel,
                type: ViraFormFieldType.Checkbox,
                value: teamWithEdits.isTeamApprovedByAdmin,
                isHidden: !inputs.allowAdmin,
            },
            isTestTeam: {
                label: inputs.frontendState.i18nClient.get.AppTeamDetails.isTestLabel,
                type: ViraFormFieldType.Checkbox,
                value: teamWithEdits.isTestTeam,
                isHidden: !inputs.allowAdmin,
            },
        } satisfies ViraFormFields satisfies Record<keyof typeof state.teamEdits, ViraFormField>;

        const canSave: boolean =
            !!state.teamEdits &&
            !!Object.keys(state.teamEdits).length &&
            areFormFieldsValid(formFields);

        const deactivateTemplate =
            selectedTeamData && inputs.allowAdmin
                ? html`
                      <${ViraButton.assign({
                          text: inputs.frontendState.i18nClient.get.AppTeamDetails
                              .deactivateTeamButtonText,
                          colorVariant: ViraColorVariant.Danger,
                          isDisabled: canSave || !!state.loadingState,
                          icon:
                              state.loadingState === LoadingState.Deactivate
                                  ? LoaderAnimated24Icon
                                  : undefined,
                      })}
                          class="deactivate-button"
                          ${listen('click', async () => {
                              if (
                                  state.teamEdits ||
                                  state.loadingState ||
                                  !globalThis.confirm(
                                      inputs.frontendState.i18nClient.get.AppTeamDetails.confirmDeactivateTeam(
                                          {
                                              teamName: selectedTeamData.team.teamName,
                                              userCount: `${selectedTeamData.users.length} ${selectedTeamData.users.length === 1 ? 'user' : 'users'}`,
                                          },
                                      ),
                                  )
                              ) {
                                  return;
                              }

                              try {
                                  if (!inputs.allowAdmin) {
                                      throw new Error(
                                          'Cannot deactivate team without admin access.',
                                      );
                                  }

                                  updateState({
                                      loadingState: LoadingState.Deactivate,
                                      error: undefined,
                                  });
                                  const {ok, data} = await inputs.frontendState.apiClient.endpoints[
                                      '/internal-admin/deactivate-team'
                                  ].fetch({
                                      requestData: {
                                          teamId: selectedTeamData.team.id,
                                      },
                                  });

                                  if (!ok) {
                                      throw new Error(data);
                                  }

                                  dispatch(new AdminTeamReloadEvent(undefined));
                                  updateState({
                                      teamEdits: undefined,
                                  });
                              } catch (error) {
                                  updateState({
                                      error: combineErrorMessages(
                                          inputs.frontendState.i18nClient.get.AppTeamDetails
                                              .failedToDeactivateTeam,
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
                : nothing;

        return html`
            ${state.error
                ? html`
                      <${ViraError}>
                          ${combineErrorMessages(
                              inputs.frontendState.i18nClient.get.AppTeamDetails.error,
                              state.error,
                          )}
                      </${ViraError}>
                  `
                : nothing}

            <${ViraForm.assign({
                fields: formFields,
                isDisabled: !!state.loadingState,
            })}
                ${listen(ViraForm.events.valueChange, (event) => {
                    if (!check.isKeyOf(event.detail.key, formFields)) {
                        return;
                    }

                    const newEdits =
                        selectedTeamData &&
                        event.detail.value === inputs.selectedTeamData.team[event.detail.key]
                            ? omitObjectKeys(state.teamEdits || {}, [event.detail.key])
                            : {
                                  ...state.teamEdits,
                                  [event.detail.key]: event.detail.value,
                              };

                    if (Object.keys(newEdits).length) {
                        updateState({
                            teamEdits: newEdits,
                        });
                    } else {
                        updateState({
                            teamEdits: undefined,
                        });
                    }
                })}
            >
                <div class="buttons">
                    <${ViraButton.assign({
                        text: inputs.frontendState.i18nClient.get.AppTeamDetails
                            .cancelTeamEditsButtonText,
                        colorVariant: ViraColorVariant.Neutral,
                        isDisabled: (selectedTeamData && !canSave) || !!state.loadingState,
                    })}
                        ${listen('click', () => {
                            if (selectedTeamData) {
                                updateState({
                                    teamEdits: undefined,
                                    error: undefined,
                                });
                            } else {
                                dispatch(
                                    new ChangeRouteEvent({
                                        paths: frontendPathTree.paths.children.app.children[
                                            'internal-admin'
                                        ].children.teams.fullPaths,
                                    }),
                                );
                            }
                        })}
                    ></${ViraButton}>
                    <${ViraButton.assign({
                        text: inputs.frontendState.i18nClient.get.AppTeamDetails
                            .saveTeamEditsButtonText,
                        isDisabled: !canSave || !!state.loadingState,
                        icon:
                            state.loadingState === LoadingState.Saving
                                ? LoaderAnimated24Icon
                                : undefined,
                    })}
                        ${listen('click', async () => {
                            if (!state.teamEdits || !canSave || state.loadingState) {
                                return;
                            }

                            try {
                                updateState({
                                    loadingState: LoadingState.Saving,
                                    error: undefined,
                                });
                                const {ok, data} = selectedTeamData
                                    ? await inputs.frontendState.apiClient.endpoints[
                                          '/team/edit'
                                      ].fetch({
                                          requestData: {
                                              teamId: inputs.allowAdmin
                                                  ? selectedTeamData.team.id
                                                  : undefined,
                                              ...selectFrom(state.teamEdits, {
                                                  isTeamApprovedByAdmin: true,
                                                  teamName: true,
                                                  isTestTeam: true,
                                              }),
                                          },
                                      })
                                    : inputs.allowAdmin
                                      ? await inputs.frontendState.apiClient.endpoints[
                                            '/internal-admin/create-team'
                                        ].fetch({
                                            requestData: teamWithEdits,
                                        })
                                      : {
                                            ok: false as const,
                                            data: 'Cannot create team without admin access.',
                                        };

                                if (!ok) {
                                    throw new Error(stringify(data));
                                }

                                if (selectedTeamData) {
                                    dispatch(
                                        new AdminTeamUpdateEvent({
                                            teamId: selectedTeamData.team.id,
                                            teamUpdate: selectFrom(state.teamEdits, {
                                                isTeamApprovedByAdmin: true,
                                                teamName: true,
                                                isTestTeam: true,
                                            }),
                                        }),
                                    );
                                } else {
                                    dispatch(
                                        new AdminTeamReloadEvent({
                                            newTeam: data
                                                ? {
                                                      newTeamId: data.id,
                                                      teamFilter:
                                                          teamWithEdits.isTeamApprovedByAdmin
                                                              ? TeamFilter.Approved
                                                              : TeamFilter.NotApproved,
                                                  }
                                                : undefined,
                                        }),
                                    );
                                }
                                updateState({
                                    teamEdits: undefined,
                                });
                            } catch (error) {
                                updateState({
                                    error: combineErrorMessages(
                                        inputs.frontendState.i18nClient.get.AppTeamDetails
                                            .failedToSave,
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
                </div>
            </${ViraForm}>
            ${deactivateTemplate}
        `;
    },
});
