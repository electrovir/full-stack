import {mapObjectValues, match} from '@augment-vir/common';
import {css, type CSSResult} from 'element-vir';

const bodyFontSizePx = {
    largeBody: 18,
    body: 16,
    smallBody: 14,
};

export const fontSizePx = {
    ...bodyFontSizePx,
    h1: 24,
    h2: bodyFontSizePx.largeBody,
    h3: bodyFontSizePx.body,
};

export const appFont: Record<keyof typeof fontSizePx, CSSResult> = mapObjectValues(
    fontSizePx,
    (key, value) => {
        return css`
            ${match(key, /h\d/)
                ? css`
                      font-weight: bold;
                  `
                : css`
                      font-weight: normal;
                  `}
            font-size: ${value}px;
        `;
    },
);
