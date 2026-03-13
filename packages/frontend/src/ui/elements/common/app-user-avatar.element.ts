import {assertWrap, check} from '@augment-vir/assert';
import {filterMap, getObjectTypedEntries} from '@augment-vir/common';
import {colorCss} from '@electrovir/color';
import {css, html} from 'element-vir';
import {viraTheme} from 'vira';
import {defineAppElement} from './define-app-element.js';

const avatarColors = filterMap(
    getObjectTypedEntries(viraTheme.colors),
    ([
        key,
        themeColor,
    ]) => {
        if (!key.includes('behind-bg-small-body')) {
            return undefined;
        }
        return themeColor;
    },
    check.isTruthy,
);

const letterACodePoint = assertWrap.isDefined('A'.codePointAt(0));

function letterToColorPair(letter: string) {
    const letterCode = letter.toUpperCase().codePointAt(0) || letterACodePoint;

    const colorIndex = (letterCode - letterACodePoint) % avatarColors.length;
    return assertWrap.isDefined(avatarColors[colorIndex]);
}

export const AppUserAvatar = defineAppElement<{
    userName: string;
}>()({
    tagName: 'app-user-avatar',
    styles: css`
        :host {
            display: inline-block;
            width: 40px;
            aspect-ratio: 1;
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .avatar-circle {
            border-radius: 50%;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
    `,
    render({inputs}) {
        const initial: string = inputs.userName[0] || 'U';

        const colorPair = letterToColorPair(initial);

        return html`
            <div class="avatar-circle" style=${colorCss(colorPair)}>
                <span>${initial}</span>
            </div>
        `;
    },
});
