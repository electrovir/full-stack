import {
    assertTestContext,
    type NavOptions,
    type PlaywrightTestContext,
    TestEnv,
    type UniversalTestContext,
} from '@augment-vir/test';
import {e2eNavigateTo} from './e2e-navigate.mock.js';

export async function initE2eTest(
    testContext: Readonly<UniversalTestContext>,
    navigateTo: Readonly<NavOptions>,
): Promise<Readonly<PlaywrightTestContext>> {
    assertTestContext(testContext, TestEnv.Playwright);

    await e2eNavigateTo(testContext, navigateTo);

    return testContext;
}
