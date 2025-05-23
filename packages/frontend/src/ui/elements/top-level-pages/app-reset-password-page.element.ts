import {extractErrorMessage} from '@augment-vir/common';
import {frontendPathTree} from '@evir/common';
import {css, defineElement, html, nothing} from 'element-vir';
import {LoaderAnimated24Icon, ViraIcon} from 'vira';
import {
    type PendingFrontendState,
    getFrontendResolutionState,
} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {appCssVars} from '../../styles/css-vars.js';
import {AppError} from '../common/app-error.element.js';
import {AppResetPassword} from '../sign-in/app-reset-password.element.js';

export const AppResetPasswordPage = defineElement<
    Readonly<
        PendingFrontendState<
            (typeof frontendPathTree.paths.children)['reset-password']['PathsType']
        >
    >
>()({
    tagName: 'app-reset-password-page',
    styles: css`
        ${AppResetPassword} {
            margin-top: ${appCssVars['standard-header-margin'].value};
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

        /** Do not allow a signed-in user to use this page. */
        if (resolvedState.resolvedWithUser) {
            dispatch(
                new ChangeRouteEvent({
                    paths: frontendPathTree.paths.children.app.fullPaths,
                    replace: true,
                }),
            );
            return nothing;
        }

        return html`
            <${AppResetPassword.assign(resolvedState.resolvedNoUser)}></${AppResetPassword}>
        `;
    },
});
