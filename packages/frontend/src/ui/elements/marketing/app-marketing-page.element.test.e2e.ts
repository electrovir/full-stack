import {describe, it} from '@augment-vir/test';
import {frontendPathTree} from '@evir/common';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../data/translations/en.js';
import {AppMarketingPage} from './app-marketing-page.element.js';

describe(AppMarketingPage.tagName, () => {
    it('loads the marketing page at the root URL', async (testContext) => {
        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths,
        });

        await e2eUtil.expect(page.getByText(englishPhrases.AppMarketingPage.welcome)).toBeVisible();
    });

    it('shows the Sign in button when not logged in', async (testContext) => {
        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths,
        });

        await e2eUtil
            .expect(
                page
                    .getByRole('button', {
                        name: englishPhrases.AppMarketingPage.signIn,
                    })
                    .first(),
            )
            .toBeVisible();
    });

    it('shows the Go to app button when logged in', async (testContext) => {
        await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths,
        });

        await e2eUtil
            .expect(
                page
                    .getByRole('button', {
                        name: englishPhrases.AppMarketingPage.goToApp,
                    })
                    .first(),
            )
            .toBeVisible();
    });

    it('navigates to the app when Sign in is clicked', async (testContext) => {
        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths,
        });

        await page
            .getByRole('button', {
                name: englishPhrases.AppMarketingPage.signIn,
            })
            .first()
            .click();

        /** Should navigate to the sign-in page. */
        await e2eUtil.expect(page.getByText('Please sign in')).toBeVisible();
    });
});
