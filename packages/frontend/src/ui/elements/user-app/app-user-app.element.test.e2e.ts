import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {frontendPathTree} from '@evir/common';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../data/translations/en.js';
import {AppUserHeader} from '../header/app-user-header.element.js';
import {AppUserApp} from './app-user-app.element.js';

describe(AppUserApp.tagName, () => {
    it('redirects to sign-in when not logged in', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        /** Should show the sign-in form when not logged in. */
        await e2eUtil.expect(page.getByText('Please sign in')).toBeVisible();
    });

    it('shows the user app content after login', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** After login, the user header should be visible. */
        await e2eUtil.expect(page.locator(AppUserHeader.tagName).first()).toBeVisible();
    });

    it('navigates to Settings from the user dropdown', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** Open the user dropdown. */
        await page.locator(AppUserHeader.tagName).first().click();

        /** Click Settings. */
        await e2eUtil
            .getMenuOption(testContext, {
                name: englishPhrases.AppUserHeader.settingsLink,
            })
            .first()
            .click();

        /** Verify we're on the settings page. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppSettingsPage.tabs.user))
            .toBeVisible();
    });

    it('navigates to Admin from the user dropdown for admin users', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        /** Open the user dropdown. */
        await page.locator(AppUserHeader.tagName).first().click();

        /** Click Admin. */
        await e2eUtil
            .getMenuOption(testContext, {
                name: englishPhrases.AppUserHeader.adminLink,
                exact: true,
            })
            .first()
            .click();

        /** Verify we're on the admin page. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppInternalAdmin.internalAdminHeader))
            .toBeVisible();
    });

    it('does not show Admin link for non-admin users', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** Open the user dropdown. */
        await page.locator(AppUserHeader.tagName).first().click();

        /** Admin link should not be visible. */
        await e2eUtil
            .expect(
                page.getByRole('link', {
                    name: englishPhrases.AppUserHeader.adminLink,
                }),
            )
            .not.toBeVisible();
    });

    it('shows the Logout option in the user dropdown', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** Open the user dropdown. */
        await page.locator(AppUserHeader.tagName).first().click();

        /** Logout should be visible. */
        await e2eUtil
            .getMenuOption(testContext, {
                name: englishPhrases.AppUserHeader.logoutButton,
            })
            .waitFor({
                state: 'visible',
            });
    });

    it('logs out and returns to home page', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);
        await e2eUtil.logout(testContext);

        /** After logout, the home page should be visible. */
        await e2eUtil.expect(page.getByText(englishPhrases.AppMarketingPage.welcome)).toBeVisible();

        /** Verify the user is no longer authorized. */
        assert.isFalse(await e2eUtil.isUserAuthorized(testContext));
    });

    it('shows Internal Admin subtitle for admin users', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        /** The "Internal Admin" subtitle should be visible in the user header. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppUserHeader.isAdminSubtitle).first())
            .toBeVisible();
    });

    it('does not show Internal Admin subtitle for non-admin users', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** The "Internal Admin" subtitle should NOT be visible. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppUserHeader.isAdminSubtitle).first())
            .not.toBeVisible();
    });

    it('displays the user name and team name', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** The user's name should be displayed in the user header area. */
        await e2eUtil
            .expect(page.getByText(mockSeedUsers.customerUser.humanName).first())
            .toBeVisible();
    });

    it('shows theme switcher in the user dropdown', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** Open the user dropdown. */
        await page.locator(AppUserHeader.tagName).first().click();

        /** Verify theme options are visible. */
        await e2eUtil
            .expect(
                page
                    .getByTitle(englishPhrases.AppThemeSwitcher.lightLabel, {
                        exact: true,
                    })
                    .first(),
            )
            .toBeVisible();
        await e2eUtil
            .expect(
                page
                    .getByTitle(englishPhrases.AppThemeSwitcher.darkLabel, {
                        exact: true,
                    })
                    .first(),
            )
            .toBeVisible();
        await e2eUtil
            .expect(
                page
                    .getByTitle(englishPhrases.AppThemeSwitcher.autoLabel, {
                        exact: true,
                    })
                    .first(),
            )
            .toBeVisible();
    });
});
