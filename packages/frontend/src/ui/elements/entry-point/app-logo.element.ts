import {mapObjectValues} from '@augment-vir/common';
import {css, defineElement, html} from 'element-vir';

export const AppLogo = defineElement<{tone: LogoTone}>()({
    tagName: 'app-logo',
    styles: css`
        :host {
            display: block;
            height: 100px;
            aspect-ratio: 1;
        }
    `,
    render({inputs}) {
        return logoSvgs[inputs.tone];
    },
});

const logoSvgs = {
    color: html`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#87CEFA; stop-opacity:1" />

                    <stop offset="100%" style="stop-color:#4682B4; stop-opacity:1" />
                </linearGradient>
            </defs>

            <rect
                x="50"
                y="50"
                width="100"
                height="100"
                fill="url(#bg)"
                transform="rotate(45 100 100)"
            />
        </svg>
    `,
    mono: html`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
            <rect
                x="50"
                y="50"
                width="100"
                height="100"
                fill="white"
                transform="rotate(45 100 100)"
            />
        </svg>
    `,
};

export const LogoTone = mapObjectValues(logoSvgs, (key) => key) as Record<
    keyof typeof logoSvgs,
    keyof typeof logoSvgs
> as {[Key in keyof typeof logoSvgs]: Key};

export type LogoTone = keyof typeof logoSvgs;
