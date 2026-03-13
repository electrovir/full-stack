import {css, html} from 'element-vir';
import {LoaderAnimated24Icon, ViraIcon} from 'vira';
import {defineAppElement} from './define-app-element.js';

export const centeredMessageStyles = css`
    width: 600px;
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 1;
    display: flex;
    justify-content: center;
    align-items: center;
`;

export const AppLoader = defineAppElement()({
    tagName: 'app-loader',
    styles: css`
        :host {
            ${centeredMessageStyles}
        }
    `,
    render() {
        return html`
            <${ViraIcon.assign({
                icon: LoaderAnimated24Icon,
            })}></${ViraIcon}>
        `;
    },
});
