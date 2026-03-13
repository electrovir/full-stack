import {assert, check} from '@augment-vir/assert';
import {
    camelCaseToKebabCase,
    collapseWhiteSpace,
    getObjectTypedEntries,
    getObjectTypedKeys,
    indent,
    log,
    removeSuffix,
    setFirstLetterCasing,
    StringCase,
} from '@augment-vir/common';
import {walkFiles} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import {frontendSrcDirPath} from '@evir/common-backend';
import englishPhrases from '@evir/frontend/src/data/translations/en.js';
import {appTagPrefix} from '@evir/frontend/src/ui/elements/common/define-app-element.js';
import {existsSync} from 'node:fs';
import {basename, join} from 'node:path';
import {pathToFileURL} from 'node:url';

const phrasesFilePath = {
    ts: join(frontendSrcDirPath, 'data', 'translations', 'en.ts'),
    js: join(frontendSrcDirPath, 'data', 'translations', 'en.js'),
};

function joinAllKeyChains(phrases: Phrases, keyChain: string[] = []): string[] {
    return getObjectTypedEntries(phrases).flatMap(
        ([
            key,
            value,
        ]) => {
            if (check.isObject(value)) {
                return joinAllKeyChains(value, [
                    ...keyChain,
                    key,
                ]);
            } else {
                return [
                    ...keyChain,
                    key,
                ].join('.');
            }
        },
    );
}

type Phrases = {[Key in string]: string | Phrases};

async function importPhrases(): Promise<Phrases> {
    assert.isTrue(existsSync(phrasesFilePath.ts), `Invalid path: ${phrasesFilePath.ts}`);

    const phrasesImport = await import(pathToFileURL(phrasesFilePath.js).href);
    return phrasesImport.default as Phrases;
}

export async function findUnusedTranslationKeys(): Promise<string[]> {
    const phrasesObj = await importPhrases();
    const allKeyChains = joinAllKeyChains(phrasesObj);

    const missing = new Set(allKeyChains);

    await walkFiles({
        startDirPath: frontendSrcDirPath,
        shouldRead({path, isDir}) {
            return isDir || path !== phrasesFilePath.ts;
        },
        handleFileContents({contents}) {
            const collapsed = collapseWhiteSpace(String(contents)).replaceAll(/\s/g, '');

            missing.forEach((missingKeyChain) => {
                if (collapsed.includes(missingKeyChain)) {
                    missing.delete(missingKeyChain);
                }
            });
        },
    });

    return Array.from(missing);
}

const appKeyPrefix: string = setFirstLetterCasing(
    removeSuffix({
        value: appTagPrefix,
        suffix: '-',
    }),
    StringCase.Upper,
);

describe('translations', () => {
    it('are all referenced via i18n.get', async () => {
        const missing = await findUnusedTranslationKeys();

        if (!check.isEmpty(missing)) {
            log.error(`\nUnused translation keys:\n${indent(missing.join('\n'))}\n`);
            assert.isEmpty(missing);
        }
    });
    it('correspond to elements', async () => {
        const appKeys = getObjectTypedKeys(englishPhrases).filter((key) =>
            key.startsWith(appKeyPrefix),
        );

        const elementFileNames = new Set<string>();

        await walkFiles({
            startDirPath: frontendSrcDirPath,
            shouldRead({isDir, path}) {
                return isDir || path.endsWith('.element.ts');
            },
            handleFileContents({path}) {
                elementFileNames.add(basename(path));
            },
        });

        const keysWithoutElement = appKeys.filter((key) => {
            const expectedFileName = `${camelCaseToKebabCase(key)}.element.ts`;
            return !elementFileNames.has(expectedFileName);
        });

        if (!check.isEmpty(keysWithoutElement)) {
            log.error(
                `\nTranslation keys with no matching element file:\n${indent(keysWithoutElement.join('\n'))}\n`,
            );
            assert.isEmpty(keysWithoutElement);
        }
    });
});
