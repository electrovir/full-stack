import {type FrontendPaths, frontendPathTree} from '@evir/common';
import {ElementBookApp, type ValidBookPaths} from 'element-book';
import {css, html, listen} from 'element-vir';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {appColors} from '../../styles/color-theme.js';
import {defineAppElement} from '../common/define-app-element.js';
import {allBookPages} from './all-book-pages.js';
import {type DesignGlobals} from './top-level-book-pages.js';

export const AppDesign = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
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
        return html`
            <${ElementBookApp.assign({
                pages: allBookPages,
                elementBookRoutePaths: inputs.frontendState.currentRoute.paths.slice(
                    1,
                ) as ValidBookPaths,
                themeColor: appColors.colors['app-brand-primary'].foreground.default,
                globalValues: {
                    frontendState: inputs.frontendState,
                } satisfies DesignGlobals,
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
