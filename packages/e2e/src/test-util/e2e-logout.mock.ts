import {waitUntil} from '@augment-vir/assert';
import {wait} from '@augment-vir/common';
import {
    assertTestContext,
    TestEnv,
    testPlaywright,
    type UniversalTestContext,
} from '@augment-vir/test';
import {AppUserHeader} from '@evir/frontend/src/ui/elements/header/app-user-header.element.js';
import {expect} from '@playwright/test';
import {
    createHomePageLocator,
    createLoginScreenLocator,
    isUserAuthorized,
} from './e2e-login.mock.js';

export async function e2eLogout(this: void, testContext: Readonly<UniversalTestContext>) {
    assertTestContext(testContext, TestEnv.Playwright);
    await expect(createLoginScreenLocator(testContext)).not.toBeVisible();

    const userHeader = testContext.page.locator(AppUserHeader.tagName).first();

    await userHeader.click();

    await testPlaywright
        .getMenuOption(testContext, {
            name: 'Logout',
        })
        .first()
        .click();

    await expect(createHomePageLocator(testContext)).toBeVisible({
        timeout: 30_000,
    });

    await wait({
        seconds: 1,
    });
    await waitUntil.isFalse(
        async () => {
            return await isUserAuthorized(testContext);
        },
        {
            interval: {
                seconds: 1,
            },
            timeout: {
                minutes: 2,
            },
        },
    );
}
