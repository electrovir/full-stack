import {assert} from '@augment-vir/assert';
import {randomString, safeMatch} from '@augment-vir/common';
import {assertWrapTestContext, describe, it, TestEnv} from '@augment-vir/test';
import {EmailCodeType, frontendPathTree} from '@evir/common';
import {mockSeedTeams, mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../data/translations/en.js';
import {AppScrollList} from '../common/app-scroll-list.element.js';
import {AppVerify} from './app-verify.element.js';

describe(AppVerify.tagName, () => {
    it('shows invalid link when params missing', async (testContext) => {
        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.verify,
        });
        await e2eUtil.expect(page.getByText(englishPhrases.AppVerify.invalidLink)).toBeVisible();
    });

    it('shows error for invalid account verification code', async (testContext) => {
        const {page} = assertWrapTestContext(testContext, TestEnv.Playwright);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.verify,
            search: {
                id: 'invalid-id',
                code: 'invalid-code',
                type: EmailCodeType.AccountVerification,
            },
        });

        await e2eUtil
            .expect(page.getByText(englishPhrases.AppVerify.accountVerificationError))
            .toBeVisible();
    });

    it('shows error on invalid changed email code', async (testContext) => {
        const {page} = assertWrapTestContext(testContext, TestEnv.Playwright);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.verify,
            search: {
                id: 'dummy-id',
                code: 'dummy-code',
                type: EmailCodeType.ChangedEmailVerification,
            },
        });

        await e2eUtil
            .expect(
                page.getByText(
                    englishPhrases.AppVerify.changedEmailVerificationError.replaceAll(
                        // eslint-disable-next-line sonarjs/slow-regex
                        /{{[^}]+}}/g,
                        '',
                    ),
                ),
            )
            .toBeVisible();
    });

    it('handles user invites', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        const invitedEmail = [
            randomString(16),
            'example.com',
        ].join('@');
        const invitedPassword = randomString(32);

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });

        await page
            .getByTestId(AppScrollList.testIds.optionCard)
            .filter({
                hasText: mockSeedTeams.customerTeam.teamName,
            })
            .first()
            .click();
        await page
            .getByText(englishPhrases.AppTeam.tabs.users, {
                exact: true,
            })
            .first()
            .click();
        await page.getByText(englishPhrases.AppTeamUsers.inviteUserButtonText).first().click();

        await e2eUtil.enterTextByLabel(testContext, {
            label: englishPhrases.AppTeamUser.emailAddressLabel,
            text: invitedEmail,
        });

        /** Save the invite. */
        await page
            .getByRole('button', {
                name: englishPhrases.AppTeamUser.saveUserEditsButtonText,
            })
            .first()
            .click();

        /** Log out the admin. */
        await e2eUtil.logout(testContext);

        /** Find the invitation email sent to the invited user. */
        const emailFile = await e2eUtil.findEmailFile(testContext, invitedEmail);
        assert.isDefined(emailFile);
        assert.strictEquals(emailFile.toAddresses[0], invitedEmail);

        /** Extract the verification link from the email. */
        const [
            ,
            inviteLink,
        ] = safeMatch(emailFile.text, /accept: (.+)\.\s+This URL/);
        assert.isTruthy(inviteLink, `Failed to extract invite link URL from '${emailFile.text}'`);

        /** Navigate to the invitation verification link. */
        await page.goto(inviteLink, {
            waitUntil: 'domcontentloaded',
        });

        /**
         * The verify page validates the code, then shows the "create first password" form for
         * UserInvitation code types.
         */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppEnterResetPassword.createFirstPasswordHeader))
            .toBeVisible();

        /** Enter the new password. */
        const passwordInput = page.locator('input[type="password"]').first();
        await e2eUtil.expect(passwordInput).toBeVisible();
        await passwordInput.fill(invitedPassword);

        /** Enter the user's name. */
        await e2eUtil.enterTextByLabel(testContext, {
            label: englishPhrases.AppEnterResetPassword.yourNameLabel,
            text: 'Invited User',
        });

        /** Submit the password. */
        await page
            .getByRole('button', {
                name: englishPhrases.AppEnterResetPassword.submitFirstPasswordButton,
            })
            .first()
            .click();

        /** Verify the success message. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppEnterResetPassword.successfulPasswordCreation))
            .toBeVisible();

        /** Log in with the new user's credentials. */
        await e2eUtil.login(testContext, {
            emailAddress: invitedEmail,
            password: invitedPassword,
        });

        /** Confirm the invited user is now authorized. */
        assert.isTrue(await e2eUtil.isUserAuthorized(testContext));
    });
});
