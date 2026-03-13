import {generateDevPhrases, I18nClient, Locale} from 'i18n-vir';
import {parseUrl} from 'url-vir';

export async function createAppI18nClient(forceLanguage?: string | undefined) {
    return await I18nClient.createInstance(
        Locale.en,
        {
            en: () => import('../../translations/en.js'),
            dev: () => generateDevPhrases(import('../../translations/en.js'), 'X'),
            'dev-long': () =>
                generateDevPhrases(
                    import('../../translations/en.js'),
                    'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
                ),
        },
        {
            lng:
                forceLanguage ||
                parseUrl(globalThis.location.href).searchParams.lang?.[0] ||
                globalThis.navigator.language,
            interpolation: {
                escapeValue: false,
            },
        },
    );
}

export type AppI18nClient = Awaited<ReturnType<typeof createAppI18nClient>>;
