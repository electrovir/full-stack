import {css, html} from 'element-vir';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appCssVars} from '../../styles/css-vars.js';
import {AppPage} from '../common/app-page.element.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppVerify} from './app-verify.element.js';

export const AppVerifyPage = defineAppElement<{frontendState: Readonly<FrontendState>}>()({
    tagName: 'app-verify-page',
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
        return html`
            <${AppPage}>
                <${AppVerify.assign({
                    frontendState: inputs.frontendState,
                })}></${AppVerify}>
            </${AppPage}>
        `;
    },
});
