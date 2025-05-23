import {extractErrorMessage} from '@augment-vir/common';
import {type frontendPathTree} from '@evir/common';
import {css, defineElement, html} from 'element-vir';
import {LoaderAnimated24Icon, ViraIcon} from 'vira';
import {
    getFrontendResolutionState,
    type PendingFrontendState,
} from '../../../data/frontend-state/frontend-state.js';
import {appCssVars} from '../../styles/css-vars.js';
import {AppUserApp} from '../app/app-user-app.element.js';
import {AppError} from '../common/app-error.element.js';
import {AppSignIn} from '../sign-in/app-sign-in.element.js';

export const AppApp = defineElement<
    PendingFrontendState<typeof frontendPathTree.paths.children.app.PathsType>
>()({
    tagName: 'app-app',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            container-type: inline-size;
        }
        ${AppUserApp} {
            flex-grow: 1;
            align-self: stretch;
        }

        ${AppSignIn} {
            margin-top: ${appCssVars['standard-header-margin'].value};
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
                <${AppError}><p>${extractErrorMessage(resolvedState.error)}</p></${AppError}>
            `;
        }

        if (resolvedState.resolvedNoUser) {
            return html`
                <${AppSignIn.assign(resolvedState.resolvedNoUser)}></${AppSignIn}>
            `;
        }

        return html`
            <${AppUserApp.assign(resolvedState.resolvedWithUser)}></${AppUserApp}>
        `;
    },
});
