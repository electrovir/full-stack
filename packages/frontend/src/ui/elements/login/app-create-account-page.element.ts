import {extractErrorMessage} from '@augment-vir/common';
import {frontendPathTree} from '@evir/common';
import {css, html, nothing} from 'element-vir';
import {LoaderAnimated24Icon, ViraError, ViraIcon} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {appCssVars} from '../../styles/css-vars.js';
import {AppPage} from '../common/app-page.element.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppCreateAccount} from './app-create-account.element.js';

export const AppCreateAccountPage = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-create-account-page',
    styles: css`
        :host {
            display: flex;
            justify-content: center;
        }
        ${AppPage} {
            margin-top: ${appCssVars['app-small-page-header-margin'].value};
        }
    `,
    render({inputs, dispatch}) {
        if (inputs.frontendState.user instanceof Promise) {
            return html`
                <${AppPage}>
                    <${ViraIcon.assign({
                        icon: LoaderAnimated24Icon,
                    })}></${ViraIcon}>
                </${AppPage}>
            `;
        } else if (inputs.frontendState.user instanceof Error) {
            return html`
                <${AppPage}>
                    <${ViraError}>${extractErrorMessage(inputs.frontendState.user)}</${ViraError}>
                </${AppPage}>
            `;
        }

        /** Do not allow a signed-in user to use this page. */
        if (inputs.frontendState.user) {
            dispatch(
                new ChangeRouteEvent({
                    paths: frontendPathTree.paths.fullPaths,
                    replace: true,
                }),
            );
            return nothing;
        }

        return html`
            <${AppPage}>
                <${AppCreateAccount.assign({
                    frontendState: inputs.frontendState,
                })}></${AppCreateAccount}>
            </${AppPage}>
        `;
    },
});
