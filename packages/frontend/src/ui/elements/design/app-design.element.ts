import {extractErrorMessage} from '@augment-vir/common';
import {type FrontendPaths, frontendPathTree} from '@evir/common';
import {ElementBookApp, type ValidBookPaths} from 'element-book';
import {css, defineElement, html, listen} from 'element-vir';
import {LoaderAnimated24Icon, ViraIcon} from 'vira';
import {
    type PendingFrontendState,
    getFrontendResolutionState,
} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {AppError} from '../common/app-error.element.js';
import {allPages} from './all-book-pages.js';
import {type BookGlobals} from './book-globals.js';

export const AppDesign = defineElement<
    PendingFrontendState<typeof frontendPathTree.paths.children.design.PathsType>
>()({
    tagName: 'app-design',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
        }

        ${ElementBookApp} {
            flex-grow: 1;
        }
    `,
    render({inputs, dispatch}) {
        const resolvedState = getFrontendResolutionState(inputs);

        if (resolvedState.pending) {
            return html`
                <${ViraIcon.assign({icon: LoaderAnimated24Icon})}></${ViraIcon}>
            `;
        } else if (resolvedState.error) {
            return html`
                <${AppError}><p>${extractErrorMessage(resolvedState.error)}</p></${AppError}>
            `;
        }

        return html`
            <${ElementBookApp.assign({
                pages: allPages,
                elementBookRoutePaths: inputs.currentRoute.paths.slice(1) as ValidBookPaths,
                themeColor: 'dodgerblue',
                globalValues: resolvedState.resolved satisfies BookGlobals,
            })}
                ${listen(ElementBookApp.events.pathUpdate, (event) => {
                    dispatch(
                        new ChangeRouteEvent({
                            paths: [
                                ...frontendPathTree.paths.children.design.fullPaths,
                                ...event.detail,
                            ] as FrontendPaths,
                        }),
                    );
                })}
            ></${ElementBookApp}>
        `;
    },
});
