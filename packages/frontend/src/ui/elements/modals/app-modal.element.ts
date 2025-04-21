import {css, defineElement, html, listen, nothing} from 'element-vir';
import {CloseX24Icon, noNativeFormStyles, ViraIcon} from 'vira';
import {
    getFrontendResolutionState,
    type PendingFrontendState,
} from '../../../data/frontend-state/frontend-state.js';
import {getModal, type CurrentModal} from '../../../data/frontend-state/modal-map.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {appCssVars} from '../../styles/css-vars.js';

export const AppModal = defineElement<Readonly<PendingFrontendState>>()({
    tagName: 'app-modal',
    state() {
        return {
            currentModel: undefined as undefined | CurrentModal,
            cleanup: undefined as undefined | (() => void),
        };
    },
    hostClasses: {
        'app-modal-hidden': ({state}) => !state.currentModel,
    },
    styles: ({hostClasses}) => css`
        :host {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            z-index: 99999;
            height: 100%;
            width: 100%;
        }

        ${hostClasses['app-modal-hidden'].selector} {
            z-index: -1000;
            pointer-events: none;
            visibility: hidden;
        }

        .modal-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.1);
        }

        .modal-position {
            pointer-events: none;
            position: sticky;
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            top: 0;
        }

        .modal-wrapper {
            overflow-y: auto;
            overflow-x: hidden;
            pointer-events: all;
            padding: ${appCssVars['app-content-padding'].value} 0;
            background-color: white;
            border-radius: 16px;
            border: 2px solid #f7f3ff;
            max-height: 100%;
            max-width: 100%;
            box-sizing: border-box;
            display: flex;
            position: relative;
        }

        .modal-content {
            overflow: hidden;
            max-width: 100%;
            max-height: 100%;
            box-sizing: border-box;
        }

        .modal-content > * {
            max-width: 100%;
            max-height: 100%;
            overflow-x: hidden;
            padding: 0 ${appCssVars['app-content-padding'].value};
        }

        .close-button {
            display: flex;
            padding: 4px;
            height: 28px;
            width: 28px;
            ${noNativeFormStyles};
            cursor: pointer;
            position: absolute;
            top: 8px;
            right: 8px;
            color: #bbb;
        }

        .close-button:hover {
            color: red;
        }

        .close-button ${ViraIcon} {
            height: 100%;
            width: 100%;
        }
    `,
    init({state, updateState, dispatch}) {
        if (!state.cleanup) {
            function listener(event: KeyboardEvent) {
                if (event.key.toLowerCase() === 'escape' && state.currentModel) {
                    dispatch(
                        new ChangeRouteEvent({
                            paths: state.currentModel.exitPaths,
                            replace: true,
                        }),
                    );
                }
            }

            window.addEventListener('keydown', listener);

            updateState({
                cleanup() {
                    window.removeEventListener('keydown', listener);
                },
            });
        }
    },
    cleanup({state, updateState}) {
        state.cleanup?.();
        updateState({
            cleanup: undefined,
        });
    },
    render({inputs, state, updateState, dispatch}) {
        const resolvedState = getFrontendResolutionState(inputs);
        const frontendState = resolvedState.resolvedNoUser || resolvedState.resolvedWithUser;

        updateState({
            currentModel: frontendState ? getModal(frontendState) : undefined,
        });
        const currentModal = state.currentModel;

        if (!currentModal || !frontendState) {
            document.body.style.removeProperty('overflow');
            return nothing;
        }

        document.body.style.overflow = 'hidden';

        return html`
            <div
                class="modal-background"
                ${listen('click', () => {
                    dispatch(
                        new ChangeRouteEvent({
                            paths: currentModal.exitPaths,
                            replace: true,
                        }),
                    );
                })}
            ></div>
            <div class="modal-position">
                <div class="modal-wrapper">
                    <button class="close-button">
                        <${ViraIcon.assign({
                            icon: CloseX24Icon,
                            fitContainer: true,
                        })}
                            ${listen('click', () => {
                                dispatch(
                                    new ChangeRouteEvent({
                                        paths: currentModal.exitPaths,
                                        replace: true,
                                    }),
                                );
                            })}
                        ></${ViraIcon}>
                    </button>
                    <div class="modal-content">
                        <${currentModal.element.assign(frontendState)}></${currentModal.element}>
                    </div>
                </div>
            </div>
        `;
    },
});
