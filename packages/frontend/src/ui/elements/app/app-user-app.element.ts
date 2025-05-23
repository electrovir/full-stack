import {type frontendPathTree} from '@evir/common';
import {css, defineElement, html} from 'element-vir';
import {type FullyResolvedFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {contentWidthCss} from '../../styles/styles.js';

export const AppUserApp = defineElement<
    FullyResolvedFrontendState<typeof frontendPathTree.paths.children.app.PathsType, true>
>()({
    tagName: 'app-user-app',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            container-type: inline-size;
        }

        main {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            align-items: center;
            ${contentWidthCss};
        }
    `,
    render() {
        return html`
            <main>User logged in!</main>
        `;
    },
});
