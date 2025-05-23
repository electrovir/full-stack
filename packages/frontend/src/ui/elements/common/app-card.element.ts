import {css, defineElement, html} from 'element-vir';
import {appCssVars} from '../../styles/css-vars.js';

export enum AppCardState {
    Error = 'error',
}

export const AppCard = defineElement<{state?: AppCardState | undefined}>()({
    tagName: 'app-card',
    hostClasses: {
        'app-card-error': ({inputs}) => inputs.state === AppCardState.Error,
    },
    styles: ({hostClasses}) => css`
        :host {
            display: block;
            border: 2px solid ${appCssVars['light-border-color'].value};
            border-radius: 16px;
            padding: 16px;
        }

        ${hostClasses['app-card-error'].selector} {
            border-color: ${appCssVars['error-foreground-color'].value};
        }
    `,
    render() {
        return html`
            <slot></slot>
        `;
    },
});
