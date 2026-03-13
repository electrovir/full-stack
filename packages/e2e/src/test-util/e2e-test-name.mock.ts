import {
    assertTestContext,
    cleanTestNameAsDir,
    TestEnv,
    type UniversalTestContext,
} from '@augment-vir/test';
import {e2eTestName} from '@evir/common';

export function createFullE2eTestName(this: void, testContext: Readonly<UniversalTestContext>) {
    assertTestContext(testContext, TestEnv.Playwright);

    const testName = cleanTestNameAsDir(testContext.testName.unique).replaceAll('.', '_');

    return [
        e2eTestName,
        testName,
    ].join('_');
}
