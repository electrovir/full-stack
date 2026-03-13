import {describe, it} from '@augment-vir/test';
import {frontendPathTree} from '@evir/common';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../data/translations/en.js';
import {AppLogo} from '../common/app-logo.element.js';
import {AppEntryPoint} from './app-entry-point.element.js';

describe(AppEntryPoint.tagName, () => {
    it('renders the header and footer', async (testContext) => {
        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths,
        });

        /** Verify the Contact link is in the footer. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppFooter.contactUsLink).first())
            .toBeVisible();
    });

    it('shows the App tab in the header when logged in', async (testContext) => {
        await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths,
        });

        /** The App tab should be visible in the header when logged in. */
        await e2eUtil
            .expect(
                page
                    .getByText(englishPhrases.AppHeader.appTab, {
                        exact: true,
                    })
                    .first(),
            )
            .toBeVisible();
    });

    it('does not show the App tab when not logged in', async (testContext) => {
        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths,
        });

        /** The App tab should NOT be visible when not logged in. */
        await e2eUtil
            .expect(
                page
                    .getByText(englishPhrases.AppHeader.appTab, {
                        exact: true,
                    })
                    .first(),
            )
            .not.toBeVisible();
    });

    it('can navigate to app via header App tab', async (testContext) => {
        await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths,
        });

        /** Click the App tab in the header. */
        await page
            .getByText(englishPhrases.AppHeader.appTab, {
                exact: true,
            })
            .first()
            .click();

        /** We should no longer be on the marketing page. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppMarketingPage.welcome))
            .not.toBeVisible();
    });

    it('can navigate home via logo', async (testContext) => {
        await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** Navigate away from home. */
        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children.settings,
        });

        await page.locator(AppLogo.tagName).first().click();

        /** Verify we're back at the marketing/home page. */
        await e2eUtil.expect(page.getByText(englishPhrases.AppMarketingPage.welcome)).toBeVisible();
    });
});
