import {assert} from '@augment-vir/assert';
import {addSuffix, filterMap, removeDuplicates, removeSuffix} from '@augment-vir/common';
import {readDirRecursive} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import {e2eScreenshotsDirPath, frontendSrcDirPath} from '@evir/common-backend';
import {existsSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';

const screenshotsSuffix = '-screenshots';

async function readE2eScreenshotDirs() {
    const screenshotFilePaths = await readDirRecursive(e2eScreenshotsDirPath);

    const screenshotDirPaths = removeDuplicates(
        screenshotFilePaths.map((rawPath) => {
            /** Go up to the parent screenshot folder. */
            return resolve(join(e2eScreenshotsDirPath, rawPath), '..', '..');
        }),
    );

    return filterMap(
        screenshotDirPaths,
        (dirPath) => {
            return {
                screenshotPath: dirPath,
                testFilePath: join(
                    frontendSrcDirPath,
                    relative(
                        e2eScreenshotsDirPath,
                        removeSuffix({
                            value: dirPath,
                            suffix: screenshotsSuffix,
                        }),
                    ),
                ),
            };
        },
        (mapped, dirPath) =>
            dirPath.endsWith(
                addSuffix({
                    value: '.test.e2e.ts',
                    suffix: screenshotsSuffix,
                }),
            ),
    );
}

describe('e2e screenshots', () => {
    it('all have test files', async () => {
        assert.isTrue(existsSync(frontendSrcDirPath), 'missing e2e tests dir');
        assert.isTrue(existsSync(e2eScreenshotsDirPath), 'missing e2e screenshots dir');

        const screenshotDirPaths = await readE2eScreenshotDirs();

        assert.isLengthAtLeast(screenshotDirPaths, 1, 'No e2e screenshot directories found.');

        const missingTestfiles = filterMap(
            screenshotDirPaths,
            (screenshotDir) => screenshotDir.screenshotPath,
            (mapped, {testFilePath}) => {
                return !existsSync(testFilePath);
            },
        );

        assert.isEmpty(missingTestfiles, 'Screenshot dirs have no corresponding test file.');
    });
});
