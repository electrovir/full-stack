import {assert} from '@augment-vir/assert';
import {sortObject} from '@augment-vir/common';
import {
    applyColorThemeViaStyleElement,
    defineColorTheme,
    defineColorThemeOverride,
    themeDefaultKey,
} from 'theme-vir';
import {viraTheme, viraThemeDarkOverride} from 'vira';

export const appColors = defineColorTheme(
    {
        background: viraTheme.colors[themeDefaultKey].background,
        foreground: viraTheme.colors[themeDefaultKey].foreground,
        prefix: 'app',
    },
    sortObject({
        'app-brand-primary': {
            foreground: 'dodgerblue',
        },
        'app-backdrop-primary': {
            background: '#fbfbfc',
        },
        'app-divider-primary': {
            foreground: viraTheme.colors['vira-grey-foreground-decoration'].foreground,
        },
        'app-divider-secondary': {
            foreground: viraTheme.colors['vira-grey-foreground-decoration'].foreground,
        },
        'app-divider-tertiary': {
            foreground: viraTheme.colors['vira-grey-foreground-placeholder'].foreground,
        },
        'app-page': {
            background: viraTheme.colors[themeDefaultKey].background,
        },
        'app-body-primary': {
            foreground: viraTheme.colors[themeDefaultKey].foreground,
        },
        'app-body-secondary': {
            foreground: viraTheme.colors['vira-grey-foreground-placeholder'].foreground,
        },
        'app-body-action-primary': {
            foreground: {
                refForeground: 'app-brand-primary',
            },
        },
        'app-tab-selected': {
            foreground: viraTheme.colors['vira-blue-on-self-header'].foreground.default,
            background: viraTheme.colors['vira-blue-on-self-header'].background.default,
        },
        'app-search-result': viraTheme.colors['vira-yellow-on-self-body'],
        'app-table-row-hover': {
            background: viraTheme.colors['vira-blue-on-self-body'].background,
        },
        'app-footer': {
            background: viraTheme.colors['vira-blue-behind-bg-body'].background,
            foreground: {
                refDefaultBackground: true,
            },
        },
    }),
);

const appColorsDarkOverride = defineColorThemeOverride(appColors, 'dark', {
    colorOverrides: {
        'app-backdrop-primary': {
            background: '#07070f',
        },
    },
});

assert
    .tsType<Exclude<keyof typeof appColors.colors, typeof themeDefaultKey>>()
    .matches<`app-${string}`>();

export function applyAppColorTheme({useDark}: Readonly<{useDark: boolean}>) {
    applyColorThemeViaStyleElement(viraTheme, useDark ? viraThemeDarkOverride : undefined);
    applyColorThemeViaStyleElement(appColors, useDark ? appColorsDarkOverride : undefined);
}
