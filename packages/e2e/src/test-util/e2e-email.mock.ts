import {assert, assertWrap, waitUntil} from '@augment-vir/assert';
import {sanitizeFileName} from '@augment-vir/common';
import {readJsonFile} from '@augment-vir/node';
import {type UniversalTestContext} from '@augment-vir/test';
import {DeployEnv} from '@evir/common';
import {createDevEmailPath, type DevEmailFile} from '@evir/common-backend';
import {existsSync} from 'node:fs';
import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createFullE2eTestName} from './e2e-test-name.mock.js';

export async function findEmailFile(
    this: void,
    testContext: Readonly<UniversalTestContext>,
    /** The email address that was intended to receive this message. */
    recipientEmailAddress: string,
) {
    const emailDirPath = createDevEmailPath(DeployEnv.Dev, createFullE2eTestName(testContext));
    assert.isTruthy(emailDirPath, 'missing email dev path');

    await waitUntil.isTrue(
        () => existsSync(emailDirPath),
        {
            timeout: {
                minutes: 1,
            },
            interval: {
                seconds: 1,
            },
        },
        `Email dir never showed up: '${emailDirPath}'`,
    );

    const foundFileName = await waitUntil.isDefined(
        async () => {
            const fileNames = await readdir(emailDirPath);

            return fileNames.find((fileName) =>
                fileName.startsWith(assertWrap.isTruthy(sanitizeFileName(recipientEmailAddress))),
            );
        },
        {
            timeout: {
                minutes: 1,
            },
            interval: {
                seconds: 1,
            },
        },
    );

    return (await readJsonFile(join(emailDirPath, foundFileName))) as DevEmailFile;
}
