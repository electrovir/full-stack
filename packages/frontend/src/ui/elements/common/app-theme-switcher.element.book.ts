import {defineBookPage} from 'element-book';
import {html, listen} from 'element-vir';
import {UserThemeSelection} from '../../../data/user-theme-selection.js';
import {UserThemeSelectEvent} from '../../events/user-theme-select.event.js';
import {elementsBookPage} from '../design/top-level-book-pages.js';
import {AppThemeSwitcher} from './app-theme-switcher.element.js';

const examples: {
    inputs: Omit<typeof AppThemeSwitcher.InputsType, 'frontendState'>;
}[] = [
    {
        inputs: {
            selectedTheme: UserThemeSelection.Auto,
        },
    },
    {
        inputs: {
            selectedTheme: UserThemeSelection.Light,
        },
    },
    {
        inputs: {
            selectedTheme: UserThemeSelection.Dark,
        },
    },
];

export const appThemeSwitcherBookPage = defineBookPage({
    parent: elementsBookPage,
    title: AppThemeSwitcher.tagName,
    defineExamples({defineExample}) {
        examples.forEach((example) => {
            defineExample({
                title: String(example.inputs.selectedTheme),
                state() {
                    return {
                        selectedTheme: example.inputs.selectedTheme,
                    };
                },
                render({controls, state, updateState}) {
                    return html`
                        <${AppThemeSwitcher.assign({
                            frontendState: controls.frontendState,
                            selectedTheme: state.selectedTheme,
                        })}
                            ${listen(UserThemeSelectEvent, (event) => {
                                event.stopImmediatePropagation();
                                updateState({
                                    selectedTheme: event.detail,
                                });
                            })}
                        ></${AppThemeSwitcher}>
                    `;
                },
            });
        });
    },
});
