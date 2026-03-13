import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {frontendPathTree} from '@evir/common';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../../data/translations/en.js';
import {AppSettingsPage} from './app-settings-page.element.js';

describe(AppSettingsPage.tagName, () => {
    it('loads the settings page with User tab', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children.settings,
        });

        await e2eUtil
            .expect(page.getByText(englishPhrases.AppSettingsPage.tabs.user))
            .toBeVisible();
    });

    it('shows sign-in settings on the User tab', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children.settings.children.user,
        });

        await e2eUtil
            .expect(page.getByText(englishPhrases.AppUserSettings.signInSettingsHeader))
            .toBeVisible();

        /** Verify the email address is displayed. */
        await e2eUtil.expect(page.getByText(mockSeedUsers.customerUser.emailAddress)).toBeVisible();
    });

    it('allows editing the user email address', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children.settings.children.user,
        });

        /** Click the Edit button to enter edit mode. */
        await page
            .getByRole('button', {
                name: englishPhrases.AppUserSignInSettings.enterEditModeButton,
            })
            .first()
            .click();

        /** The cancel button should now be visible. */
        await e2eUtil
            .expect(
                page
                    .getByRole('button', {
                        name: englishPhrases.AppUserSignInSettings.cancelEditingButton,
                    })
                    .first(),
            )
            .toBeVisible();

        /** The save button should now be visible. */
        await e2eUtil
            .expect(
                page
                    .getByRole('button', {
                        name: englishPhrases.AppUserSignInSettings.saveEditButton,
                    })
                    .first(),
            )
            .toBeVisible();
    });

    it('can cancel email editing', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children.settings.children.user,
        });

        /** Click the Edit button. */
        const editButton = page.getByRole('button', {
            name: englishPhrases.AppUserSignInSettings.enterEditModeButton,
        });
        await e2eUtil.expect(editButton.first()).toBeVisible();
        await editButton.first().click();

        /** Click Cancel to exit edit mode. */
        await page
            .getByRole('button', {
                name: englishPhrases.AppUserSignInSettings.cancelEditingButton,
            })
            .first()
            .click();

        /** Edit button should reappear. */
        await e2eUtil.expect(editButton.first()).toBeVisible();
    });

    it('sends a password change email from settings', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children.settings.children.user,
        });

        /** Click "Send Password Change Email". */
        await page
            .getByRole('button', {
                name: englishPhrases.AppUserSignInSettings.sendPasswordChangeEmail,
            })
            .first()
            .click();

        /** Verify the success message appears. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppUserSignInSettings.passwordChangeEmailed))
            .toBeVisible();

        /** Verify the email was actually sent. */
        const emailFile = await e2eUtil.findEmailFile(
            testContext,
            mockSeedUsers.customerUser.emailAddress,
        );
        assert.isDefined(emailFile);
        assert.strictEquals(emailFile.toAddresses[0], mockSeedUsers.customerUser.emailAddress);
        assert.matches(emailFile.text, /reset your password/i);
    });

    it('shows the Team tab for non-admin users', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children.settings,
        });

        /** Click the Team tab. */
        await page
            .getByText(englishPhrases.AppSettingsPage.tabs.team, {
                exact: true,
            })
            .first()
            .click();

        /** The team details should load. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppTeamDetails.teamNameLabel))
            .toBeVisible();
    });

    it('shows the Members tab for non-admin users', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children.settings,
        });

        /** Click the Members tab. */
        await page
            .getByText(englishPhrases.AppSettingsPage.tabs.members, {
                exact: true,
            })
            .first()
            .click();

        /** Verify team user list content appears. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppTeamUsers.inviteUserButtonText).first())
            .toBeVisible();
    });
});
