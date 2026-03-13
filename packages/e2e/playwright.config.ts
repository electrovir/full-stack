import {
    e2eScreenshotsDirPath,
    frontendSrcDirPath,
    playwrightOutputsDirPath,
} from '@evir/common-backend';
import {defineConfig} from '@playwright/test';
import {testIdAttributeName} from 'element-vir';
import {cpus} from 'node:os';

function minutes(count: number): number {
    return Math.round(count * 60_000);
}

const isCi: boolean = !!process.env.CI;

export default defineConfig({
    fullyParallel: !isCi,

    testDir: frontendSrcDirPath,
    testMatch: '*.test.e2e.ts',

    snapshotDir: e2eScreenshotsDirPath,
    snapshotPathTemplate: '{snapshotDir}/{testFilePath}-screenshots/{testName}/{arg}{ext}',

    workers: isCi ? 1 : Math.max(cpus().length - 1, 1),
    reporter: isCi ? 'dot' : 'list',
    timeout: isCi ? minutes(5) : minutes(1),
    expect: {
        timeout: isCi ? minutes(5) : minutes(1),
    },
    globalTimeout: isCi ? minutes(20) : minutes(5),

    retries: isCi ? 3 : 1,
    outputDir: playwrightOutputsDirPath,
    use: {
        screenshot: 'only-on-failure',
        testIdAttribute: testIdAttributeName,
    },
});
