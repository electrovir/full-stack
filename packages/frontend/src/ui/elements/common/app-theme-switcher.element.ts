import {classMap, css, html, listen} from 'element-vir';
import {
    AutoTheme24Icon,
    Moon24Icon,
    noNativeFormStyles,
    noNativeSpacing,
    Sun24Icon,
    viraFormCssVars,
    ViraIcon,
} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {UserThemeSelection} from '../../../data/user-theme-selection.js';
import {UserThemeSelectEvent} from '../../events/user-theme-select.event.js';
import {appColors} from '../../styles/color-theme.js';
import {defineAppElement} from './define-app-element.js';

export const AppThemeSwitcher = defineAppElement<{
    frontendState: Readonly<FrontendState>;
    selectedTheme: UserThemeSelection | undefined;
}>()({
    tagName: 'app-theme-switcher',
    styles: css`
        :host {
            background-color: ${appColors.colors['app-page'].background.value};
            display: flex;
            align-items: center;
            box-sizing: border-box;
            gap: 4px;
        }

        button {
            ${noNativeSpacing};
            ${noNativeFormStyles};
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid transparent;
            border-radius: ${viraFormCssVars['vira-form-radius'].value};
            padding: 2px;
            cursor: pointer;
            color: ${appColors.colors['app-body-secondary'].foreground.value};

            &:hover {
                color: ${viraFormCssVars['vira-form-accent-primary-hover-color'].value};
                border-color: currentColor;
            }

            &.selected {
                pointer-events: none;
                color: ${viraFormCssVars['vira-form-accent-primary-color'].value};
                border-color: ${viraFormCssVars['vira-form-accent-primary-color'].value};
            }
        }

        ${ViraIcon} {
            width: 20px;
            aspect-ratio: 1;
        }
    `,
    render({inputs, dispatch}) {
        const selectedTheme = inputs.selectedTheme || UserThemeSelection.Auto;

        const themeOptions = [
            {
                theme: UserThemeSelection.Light,
                icon: Sun24Icon,
                label: inputs.frontendState.i18nClient.get.AppThemeSwitcher.lightLabel,
            },
            {
                theme: UserThemeSelection.Dark,
                icon: Moon24Icon,
                label: inputs.frontendState.i18nClient.get.AppThemeSwitcher.darkLabel,
            },
            {
                theme: UserThemeSelection.Auto,
                icon: AutoTheme24Icon,
                label: inputs.frontendState.i18nClient.get.AppThemeSwitcher.autoLabel,
            },
        ];

        return themeOptions.map((option) => {
            const isSelected = selectedTheme === option.theme;

            return html`
                <button
                    class=${classMap({
                        selected: isSelected,
                    })}
                    title=${option.label}
                    ${listen('click', (event) => {
                        event.stopPropagation();
                        dispatch(new UserThemeSelectEvent(option.theme));
                    })}
                >
                    <${ViraIcon.assign({
                        icon: option.icon,
                        fitContainer: true,
                    })}></${ViraIcon}>
                </button>
            `;
        });
    },
});
