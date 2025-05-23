import {css, defineElementNoInputs, html} from 'element-vir';
import {appCssVars} from '../../styles/css-vars.js';

export const AppError = defineElementNoInputs({
    tagName: 'app-error',
    styles: css`
        :host {
            color: ${appCssVars['error-foreground-color'].value};
            font-weight: bold;
        }
    `,
    render() {
        return html`
            <slot></slot>
        `;
    },
});
