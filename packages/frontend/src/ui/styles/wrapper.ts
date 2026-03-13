import {css, unsafeCSS, type CSSResult} from 'element-vir';
import {appCssVars} from './css-vars.js';

export enum WrapperElementSize {
    Large = 'large',
    Small = 'small',
}

export function wrapperBorderCss({
    color,
    size,
    forceFullBorder,
}: {
    color: CSSResult;
    size: WrapperElementSize;
    forceFullBorder?: boolean | undefined;
}) {
    const borderRadiusCssVar =
        size === WrapperElementSize.Large
            ? appCssVars['app-large-wrapper-border-radius']
            : appCssVars['app-small-wrapper-border-radius'];

    const borderRadius: CSSResult = forceFullBorder
        ? unsafeCSS(borderRadiusCssVar.default)
        : borderRadiusCssVar.value;

    return css`
        border-style: solid;
        border-color: ${color};
        border-radius: ${borderRadius};
        border-width: ${forceFullBorder
            ? unsafeCSS(appCssVars['app-wrapper-border-width'].default)
            : appCssVars['app-wrapper-border-width'].value};
    `;
}
