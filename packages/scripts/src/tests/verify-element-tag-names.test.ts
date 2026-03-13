import {assert, check} from '@augment-vir/assert';
import {
    addSuffix,
    collapseWhiteSpace,
    indent,
    kebabCaseToCamelCase,
    log,
    safeMatch,
    StringCase,
    stringify,
} from '@augment-vir/common';
import {walkFiles} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import {frontendSrcDirPath} from '@evir/common-backend';
import {appTagPrefix} from '@evir/frontend/src/ui/elements/common/define-app-element.js';
import {basename} from 'node:path';

async function findInvalidConventionFiles(tagPrefix: string) {
    const failures: {[Path in string]: string[]} = {};

    const fullTagPrefix = addSuffix({
        value: tagPrefix,
        suffix: '-',
    });

    await walkFiles({
        startDirPath: frontendSrcDirPath,
        shouldRead({isDir, path}) {
            return isDir || path.endsWith('.element.ts');
        },
        handleFileContents({contents, path}) {
            const errors: string[] = [];

            const collapsed = collapseWhiteSpace(String(contents).replaceAll('\n', ' '));
            const exportedElementNames: string[] = Array.from(
                collapsed.matchAll(/export const (\S+) = defineAppElement/g),
            )
                .map((entry) => entry[1])
                .filter(check.isTruthy);

            const [
                ,
                exportedTagName,
            ] = safeMatch(collapsed, /export const \S+ = defineAppElement.+?tagName: '([^']+)',/);

            if (
                collapsed.match(/export const \S+ = defineElement\b/) ||
                collapsed.match(/\bdefineElement as /)
            ) {
                errors.push('File uses raw defineElement.');
            }

            const fileName = basename(path);
            const fileNameForTag = fileName.split('.')[0] || '';
            const expectedTagName = fileNameForTag;
            const expectedElementName = kebabCaseToCamelCase(expectedTagName, {
                firstLetterCase: StringCase.Upper,
            });

            if (!fileNameForTag) {
                errors.push(`Unable to determine expected tag name from file name: '${fileName}'.`);
            } else if (!fileNameForTag.startsWith(fullTagPrefix)) {
                errors.push(
                    `File name does not start with '${fullTagPrefix}' prefix: '${fileNameForTag}'.`,
                );
            }
            if (fileNameForTag.toLowerCase() !== fileNameForTag) {
                errors.push(`File name is not lowercase: '${fileNameForTag}'.`);
            }

            if (check.isLengthExactly(exportedElementNames, 1)) {
                const exportedElementName = exportedElementNames[0];

                if (exportedElementName !== expectedElementName) {
                    errors.push(
                        `Invalid element name '${exportedElementName}'. Expected '${expectedElementName}'.`,
                    );
                }
            } else if (exportedElementNames.length) {
                errors.push(
                    `Multiple elements exported from a single element file: '${exportedElementNames.join(', ')}'`,
                );
            } else {
                errors.push('No element definition names found.');
            }

            if (!exportedTagName) {
                errors.push('No exported tag name found.');
            } else if (expectedTagName && exportedTagName !== expectedTagName) {
                errors.push(
                    `Invalid tag name '${exportedTagName}'. Expected '${expectedTagName}'.`,
                );
            }

            if (errors.length) {
                failures[path] = errors;
            }
        },
    });

    return failures;
}

describe('element tag names', () => {
    it('match conventions', async () => {
        const invalid = await findInvalidConventionFiles(appTagPrefix);

        if (!check.isEmpty(invalid)) {
            log.error(`\nInvalid element files:\n${indent(stringify(invalid, 4))}\n`);
            assert.isEmpty(invalid);
        }
    });
});
