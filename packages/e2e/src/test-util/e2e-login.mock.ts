import {assert, waitUntil} from '@augment-vir/assert';
import {type PartialWithUndefined, wait} from '@augment-vir/common';
import {
    assertTestContext,
    assertWrapTestContext,
    TestEnv,
    type UniversalTestContext,
} from '@augment-vir/test';
import {backendDefinitionShapes, frontendPathTree} from '@evir/common';
import englishPhrases from '@evir/frontend/src/data/translations/en.js';
import {expect} from '@playwright/test';
import {matchesPaths} from 'spa-router-vir';
import {parseUrl} from 'url-vir';
import {sendBackendRequest} from './e2e-backend-request.mock.js';
import {e2eNavigateTo} from './e2e-navigate.mock.js';

export type E2eLoginCredentials = {emailAddress: string; password: string};

export type E2eLoginOptions = PartialWithUndefined<{
    shouldFail: boolean;
}>;

export function createLoginScreenLocator(this: void, testContext: Readonly<UniversalTestContext>) {
    return assertWrapTestContext(testContext, TestEnv.Playwright)
        .page.getByText('Please sign in')
        .first();
}

export function createHomePageLocator(this: void, testContext: Readonly<UniversalTestContext>) {
    return assertWrapTestContext(testContext, TestEnv.Playwright)
        .page.getByText(englishPhrases.AppMarketingPage.welcome)
        .first();
}

/** Helper function to find and return login form elements. */
export async function getLoginElements(this: void, testContext: Readonly<UniversalTestContext>) {
    assertTestContext(testContext, TestEnv.Playwright);

    await expect(createLoginScreenLocator(testContext)).toBeVisible();

    // Find email and password input fields using input types
    const emailInput = testContext.page.locator('input[type="email"]').first();
    const passwordInput = testContext.page.locator('input[type="password"]').first();
    const signInButton = testContext.page
        .getByRole('button', {
            name: 'Sign in',
        })
        .first();

    // Wait for inputs to be visible
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(signInButton).toBeVisible();

    return {
        emailInput,
        passwordInput,
        signInButton,
    };
}

export async function e2eLogin(
    this: void,
    testContext: Readonly<UniversalTestContext>,
    credentials: Readonly<E2eLoginCredentials>,
    options?: Readonly<E2eLoginOptions> | undefined,
) {
    assertTestContext(testContext, TestEnv.Playwright);

    const isOnAppPage = matchesPaths(
        parseUrl(testContext.page.url()).paths,
        frontendPathTree.paths.children.app,
    );

    if (!isOnAppPage) {
        await e2eNavigateTo(testContext, {
            paths: frontendPathTree.paths.children.app,
        });
    }

    const {emailInput, passwordInput, signInButton} = await getLoginElements(testContext);

    await emailInput.fill(credentials.emailAddress);
    await expect(emailInput).toHaveValue(credentials.emailAddress);

    await passwordInput.fill(credentials.password);
    await expect(passwordInput).toHaveValue(credentials.password);

    await expect(testContext.page.getByText('Failed to sign in')).not.toBeVisible();

    await signInButton.click();

    if (options?.shouldFail) {
        await expect(createLoginScreenLocator(testContext)).toBeVisible();
        assert.isFalse(await isUserAuthorized(testContext));
        await expect(testContext.page.getByText('Failed to sign in')).toBeVisible();
    } else {
        await expect(createLoginScreenLocator(testContext)).not.toBeVisible();

        await wait({
            seconds: 1,
        });
        await waitUntil.isTrue(
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
}

export async function isUserAuthorized(
    this: void,
    testContext: Readonly<UniversalTestContext>,
): Promise<boolean> {
    return (
        await sendBackendRequest(testContext, backendDefinitionShapes.endpoints['/user'].path)
    ).ok();
}
