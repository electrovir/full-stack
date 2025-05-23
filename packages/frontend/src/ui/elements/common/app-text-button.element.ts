import {css, defineElementNoInputs, html} from 'element-vir';
import {noNativeFormStyles} from 'vira';

export const AppTextButton = defineElementNoInputs({
    tagName: 'app-text-button',
    styles: css`
        button {
            ${noNativeFormStyles};
            text-decoration: underline;
            cursor: pointer;
        }
    `,
    render() {
        return html`
            <button><slot></slot></button>
        `;
    },
});
