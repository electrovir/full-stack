import {assert} from '@augment-vir/assert';
import {listenTo} from 'typed-event-target';
import {applyAppColorTheme} from '../../../ui/styles/color-theme.js';
import {UserThemeSelection} from '../../user-theme-selection.js';
import {type AppLocalStorageClient} from './local-storage.client.js';

export class ThemeClient {
    protected removeThemePreference = listenTo(
        globalThis.matchMedia('(prefers-color-scheme: dark)'),
        'change',
        (event) => {
            assert.instanceOf(event, MediaQueryListEvent);
            const userThemeSelection = this.clients.localStorageClient.get.themeSelection();

            if (userThemeSelection === UserThemeSelection.Auto) {
                applyAppColorTheme({
                    useDark: event.matches,
                });
            }
        },
    );

    constructor(
        protected readonly clients: {
            localStorageClient: Readonly<AppLocalStorageClient>;
        },
    ) {
        this.setTheme(
            this.clients.localStorageClient.get.themeSelection() || UserThemeSelection.Auto,
        );
    }

    protected setTheme(userThemeSelection: UserThemeSelection) {
        const useDark =
            userThemeSelection === UserThemeSelection.Dark ||
            (userThemeSelection === UserThemeSelection.Auto &&
                window.matchMedia('(prefers-color-scheme: dark)').matches);

        applyAppColorTheme({
            useDark,
        });
    }

    public applyTheme(userThemeSelection: UserThemeSelection) {
        this.clients.localStorageClient.set.themeSelection(userThemeSelection);

        this.setTheme(userThemeSelection);
    }

    public destroy() {
        this.removeThemePreference();
    }
}
