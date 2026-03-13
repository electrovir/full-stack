import {
    assertWrapTestContext,
    TestEnv,
    testPlaywright,
    type UniversalTestContext,
} from '@augment-vir/test';
import englishPhrases from '@evir/frontend/src/data/translations/en.js';
import {expect} from '@playwright/test';

export async function createSelfServeUser(
    this: void,
    testContext: Readonly<UniversalTestContext>,
    {
        emailAddress,
        password,
        teamName,
        humanName,
    }: {
        emailAddress: string;
        password: string;
        humanName: string;
        teamName: string;
    },
) {
    const {page} = assertWrapTestContext(testContext, TestEnv.Playwright);

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill(emailAddress);
    await expect(emailInput).toHaveValue(emailAddress);

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(password);
    await expect(passwordInput).toHaveValue(password);
    await page
        .getByRole('button', {
            name: 'show password',
        })
        .first()
        .click();

    await testPlaywright.enterTextByLabel(testContext, {
        label: englishPhrases.AppCreateAccount.companyName,
        text: teamName,
    });
    await testPlaywright.enterTextByLabel(testContext, {
        label: englishPhrases.AppCreateAccount.yourNameLabel,
        text: humanName,
    });

    const createAccountButton = page
        .getByRole('button', {
            name: /create account/i,
        })
        .first();
    await expect(createAccountButton).toBeVisible();
    await createAccountButton.click();
}
