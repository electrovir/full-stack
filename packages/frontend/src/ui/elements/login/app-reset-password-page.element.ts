import {frontendPathTree} from '@evir/common';
import {css, html} from 'element-vir';
import {extractPathTree} from 'spa-router-vir';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appCssVars} from '../../styles/css-vars.js';
import {AppPage} from '../common/app-page.element.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppResetPassword, ResetPasswordType} from './app-reset-password.element.js';

export const AppResetPasswordPage = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-reset-password-page',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        ${AppPage} {
            margin-top: ${appCssVars['app-small-page-header-margin'].value};
        }
    `,
    render({inputs}) {
        const currentPathTree =
            extractPathTree(
                inputs.frontendState.currentRoute.paths,
                frontendPathTree,
                frontendPathTree.paths.children['reset-password'],
            ) ||
            extractPathTree(
                inputs.frontendState.currentRoute.paths,
                frontendPathTree,
                frontendPathTree.paths.children['forgot-password'],
            );
        if (!currentPathTree) {
            throw new Error('No reset password path match.');
        }

        const topPath = currentPathTree.fullPaths[0];

        const resetTypes: Record<typeof topPath, ResetPasswordType> = {
            'forgot-password': ResetPasswordType.ForgotPassword,
            'reset-password': ResetPasswordType.ResetPassword,
        };

        return html`
            <${AppPage}>
                <${AppResetPassword.assign({
                    frontendState: inputs.frontendState,
                    resetType: resetTypes[topPath],
                })}></${AppResetPassword}>
            </${AppPage}>
        `;
    },
});
