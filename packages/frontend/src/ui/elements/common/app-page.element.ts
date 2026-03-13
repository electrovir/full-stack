import {colorCss} from '@electrovir/color';
import {css, html} from 'element-vir';
import {appColors} from '../../styles/color-theme.js';
import {appCssVars} from '../../styles/css-vars.js';
import {wrapperBorderCss, WrapperElementSize} from '../../styles/wrapper.js';
import {defineAppElement} from './define-app-element.js';

export const AppPage = defineAppElement()({
    tagName: 'app-page',
    styles: css`
        :host {
            padding: ${appCssVars['app-page-padding'].value};
            ${wrapperBorderCss({
                color: appColors.colors['app-divider-secondary'].foreground.value,
                size: WrapperElementSize.Small,
            })}
            box-sizing: border-box;
            display: block;
            ${colorCss(appColors.colors['app-page'])}
        }
    `,
    render() {
        return html`
            <slot></slot>
        `;
    },
});
