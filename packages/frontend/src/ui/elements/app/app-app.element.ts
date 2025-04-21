import {extractErrorMessage} from '@augment-vir/common';
import {type frontendPathTree} from '@evir/common';
import {css, defineElement, html} from 'element-vir';
import {LoaderAnimated24Icon, ViraIcon} from 'vira';
import {
    getFrontendResolutionState,
    type PendingFrontendState,
} from '../../../data/frontend-state/frontend-state.js';
import {appCssVars} from '../../styles/css-vars.js';
import {errorCss} from '../../styles/styles.js';
import {AppSignUp} from '../sign-in/app-sign-up.element.js';
import {AppUserApp} from './app-user-app.element.js';

export const AppApp = defineElement<
    PendingFrontendState<typeof frontendPathTree.paths.children.app.fullPaths>
>()({
    tagName: 'app-app',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            container-type: inline-size;
        }

        .error {
            ${errorCss}
        }

        ${AppUserApp} {
            flex-grow: 1;
            align-self: stretch;
        }

        ${AppSignUp} {
            margin-top: 24px;
        }

        @container (max-width: 800px) {
            ${AppUserApp} {
                ${appCssVars['app-content-padding'].name}: 8px;
            }
        }
    `,
    render({inputs}) {
        const resolvedState = getFrontendResolutionState(inputs);

        if (resolvedState.pending) {
            return html`
                <${ViraIcon.assign({icon: LoaderAnimated24Icon})}></${ViraIcon}>
            `;
        } else if (resolvedState.error) {
            return html`
                <p class="error">${extractErrorMessage(resolvedState.error)}</p>
            `;
        }

        if (resolvedState.resolvedNoUser) {
            return html`
                <${AppSignUp.assign(resolvedState.resolvedNoUser)}></${AppSignUp}>
            `;
        }

        return html`
            <${AppUserApp.assign(resolvedState.resolvedWithUser)}></${AppUserApp}>
        `;
    },
});
