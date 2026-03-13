import {type PartialWithUndefined} from '@augment-vir/common';
import {css, html} from 'element-vir';
import {defineAppElement} from './define-app-element.js';

export const AppLogo = defineAppElement<
    PartialWithUndefined<{
        useMonochrome?: boolean | undefined;
    }>
>()({
    tagName: 'app-logo',
    styles: css`
        :host {
            display: inline-flex;
            gap: 4px;
            height: 100px;
            max-height: 100%;
            aspect-ratio: 1;
        }

        svg {
            width: 100%;
            height: 100%;
        }
    `,
    render({inputs}) {
        if (inputs.useMonochrome) {
            return logoMarkSvgs.mono;
        } else {
            return logoMarkSvgs.color;
        }
    },
});

const logoMarkSvgs = {
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
                fill="currentColor"
                transform="rotate(45 100 100)"
            />
        </svg>
    `,
};
