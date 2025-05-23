/** This is executed as a generator from `schema.prisma`. */

import {addRegExpFlags, awaitedForEach, log} from '@augment-vir/common';
import {joinFilesToDir, readDirRecursive} from '@augment-vir/node';
import {readFile, writeFile} from 'node:fs/promises';
import {relative, resolve} from 'node:path';

type Replacement = {
    match: RegExp | string;
    replace: string;
};

const replacements: Replacement[] = [
    {
        match: /\bDate\s*\|\s*string\b/,
        replace: 'UtcIsoString',
    },
    {
        match: /\bstring\s*\|\s*Date\b/,
        replace: 'UtcIsoString',
    },
    {
        match: /\bDate\b/,
        replace: 'UtcIsoString',
    },
    {
        match: '/* @ts-nocheck */',
        replace: '',
    },
];

const insertAtTop = [
    '// @ts-nocheck',
    "import {type UtcIsoString} from 'date-vir';",
];

const generatedPrismaDirPath = resolve(import.meta.dirname, '..', 'generated');

const filePathsToFix = joinFilesToDir(
    generatedPrismaDirPath,
    await readDirRecursive(generatedPrismaDirPath),
);

await awaitedForEach(filePathsToFix, async (filePathToFix) => {
    if (!filePathToFix.endsWith('.ts')) {
        return;
    }
    log.faint(`Fixing ${relative(process.cwd(), filePathToFix)}`);

    const contents = String(await readFile(filePathToFix));

    const fixedContent = [
        ...insertAtTop,
        replacements.reduce((value, replacement) => {
            return value.replaceAll(addRegExpFlags(replacement.match, 'g'), replacement.replace);
        }, contents),
    ].join('\n');

    await writeFile(filePathToFix, fixedContent);
});

log.success('Prisma map done.');
