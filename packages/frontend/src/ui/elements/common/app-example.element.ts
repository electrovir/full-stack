import {css, html} from 'element-vir';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {defineAppElement} from './define-app-element.js';

export const AppExample = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-example',
    styles: css`
        :host {
            display: flex;
        }
    `,
    render() {
        return html`
            Hello there!
        `;
    },
});
