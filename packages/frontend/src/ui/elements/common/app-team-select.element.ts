import {checkWrap} from '@augment-vir/assert';
import {type Team} from '@evir/common';
import {css, html, listen} from 'element-vir';
import {listenTo} from 'typed-event-target';
import {ViraSelect, type ViraSelectOption} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {TeamSwitchEvent} from '../../events/team-switch.event.js';
import {defineAppElement} from './define-app-element.js';

export const AppTeamSelect = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
    rawSelect?: boolean | undefined;
}>()({
    tagName: 'app-team-select',
    styles: css`
        :host {
            display: inline-flex;
            align-items: center;
        }

        ${ViraSelect} {
            width: unset;
        }
    `,
    state() {
        return {
            /** Removes event listeners registered during init. */
            cleanup: undefined as undefined | (() => void),
        };
    },
    init({state, updateState, host}) {
        state.cleanup?.();

        let propagating = false;

        const listenerRemovers = [
            listenTo(host, 'mousedown', (event) => {
                if (propagating) {
                    return;
                }

                const selectElement = checkWrap.instanceOf(
                    host.shadowRoot.querySelector(ViraSelect.tagName),
                    ViraSelect,
                );

                if (!selectElement || event.composedPath().includes(selectElement)) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                propagating = true;
                selectElement.dispatchEvent(new MouseEvent(event.type, event));
                propagating = false;
            }),
        ];

        updateState({
            cleanup: () => {
                listenerRemovers.forEach((remover) => remover());
            },
        });
    },
    cleanup({state, updateState}) {
        state.cleanup?.();
        updateState({
            cleanup: undefined,
        });
    },
    render({inputs, dispatch}) {
        const teamOptions: ReadonlyArray<Readonly<ViraSelectOption>> =
            inputs.frontendState.user.teams.map((team) => {
                return {
                    label: team.teamName,
                    value: team.id,
                };
            });

        if (teamOptions.length <= 1) {
            return html`
                <slot></slot>
            `;
        }

        return html`
            <${ViraSelect.assign({
                value: inputs.frontendState.user.selectedTeam?.team.id || '',
                options: teamOptions,
                rawSelect: inputs.rawSelect,
            })}
                ${listen(ViraSelect.events.valueChange, (event) => {
                    dispatch(new TeamSwitchEvent(event.detail as Team['id']));
                })}
            ></${ViraSelect}>
        `;
    },
});
