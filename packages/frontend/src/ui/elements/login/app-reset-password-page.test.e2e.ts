import {assert} from '@augment-vir/assert';
import {randomString, safeMatch} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {frontendPathTree} from '@evir/common';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../data/translations/en.js';
import {AppResetPasswordPage} from './app-reset-password-page.element.js';

describe(AppResetPasswordPage.tagName, () => {
    it('resets password', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        const emailAddress = mockSeedUsers.customerUser.emailAddress;
        const newPassword = randomString(32);

        await page.getByText(englishPhrases.AppSignIn.forgotPassword).click();

        const emailInput = page.getByRole('textbox', {
            name: englishPhrases.AppCredentials.emailLabel,
        });
        await e2eUtil.expect(emailInput).toBeVisible();
        await emailInput.fill(emailAddress);

        await page
            .getByRole('button', {
                name: englishPhrases.AppResetPassword.submitPasswordResetButton,
            })
            .click();

        await e2eUtil
            .expect(
                page.getByText(englishPhrases.AppEmailSuccess.forgotPasswordSubtitle, {
                    exact: false,
                }),
            )
            .toBeVisible();

        const emailFile = await e2eUtil.findEmailFile(testContext, emailAddress);
        assert.isDefined(emailFile);
        assert.strictEquals(emailFile.toAddresses[0], emailAddress);
        assert.matches(emailFile.text, /reset your password/i);

        /** Extract the reset link from the email. */
        const [
            ,
            resetLink,
        ] = safeMatch(emailFile.text, /here: (.+)\.\s+This URL/);
        assert.isTruthy(resetLink, `Failed to extract reset link URL from '${emailFile.text}'`);

        /** Navigate to the reset link. */
        await page.goto(resetLink, {
            waitUntil: 'domcontentloaded',
        });

        /** Wait for the "enter new password" form to appear. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppEnterResetPassword.enterNewPasswordHeader))
            .toBeVisible();

        /** Enter the new password. */
        const passwordInput = page.locator('input[type="password"]').first();
        await e2eUtil.expect(passwordInput).toBeVisible();
        await passwordInput.fill(newPassword);

        /** Submit the new password. */
        await page
            .getByRole('button', {
                name: englishPhrases.AppEnterResetPassword.submitNewPasswordButton,
            })
            .first()
            .click();

        /** Verify the success message. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppEnterResetPassword.successfulPasswordChange))
            .toBeVisible();

        /** Log in with the new password. */
        await e2eUtil.login(testContext, {
            emailAddress,
            password: newPassword,
        });

        /** Confirm the user is authorized. */
        assert.isTrue(await e2eUtil.isUserAuthorized(testContext));
    });
});
