/* eslint-disable sonarjs/no-hardcoded-passwords */

import {assert, waitUntil} from '@augment-vir/assert';
import {
    executeCount,
    randomString,
    safeMatch,
    setFirstLetterCasing,
    StringCase,
} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {defaultRawUniversalConfig, frontendPathTree} from '@evir/common';
import {mockSeedTeams, mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../data/translations/en.js';
import {AppScrollList} from '../common/app-scroll-list.element.js';
import {AppUserHeader} from '../header/app-user-header.element.js';
import {AppSignIn} from './app-sign-in.element.js';

const mockUser = mockSeedUsers.customerUser;

const emailVariants = [
    mockUser.emailAddress.toLowerCase(),
    setFirstLetterCasing(mockUser.emailAddress, StringCase.Upper),
    mockUser.emailAddress.toUpperCase(),
    /** SpongeBob case. */
    mockUser.emailAddress
        .split('')
        .map((char, index) => (index % 2 ? char.toUpperCase() : char.toLowerCase()))
        .join(''),
];

describe(AppSignIn.tagName, () => {
    it('loads', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.expect(page.getByText('Please sign in')).toBeVisible();
    });

    it('supports admin login', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });
        await e2eUtil.login(testContext, mockSeedUsers.adminUser);
        await page.locator(AppUserHeader.tagName).first().click();

        await e2eUtil
            .expect(
                page.getByRole('link', {
                    name: 'Admin',
                }),
            )
            .toBeVisible();
    });

    it('supports multiple login and out', async (testContext) => {
        await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });
        await e2eUtil.login(testContext, mockSeedUsers.customerUser);
        await e2eUtil.logout(testContext);
        await e2eUtil.login(testContext, mockSeedUsers.customerUser);
        await e2eUtil.logout(testContext);
        await e2eUtil.login(testContext, mockSeedUsers.customerUser);
        await e2eUtil.logout(testContext);
    });

    emailVariants.forEach((emailAddress) => {
        /** Without this, playwright thinks everything after `@` is a test "tag". */
        const playwrightSafeEmailAddress = emailAddress.replaceAll('@', '[at]');

        it(`is not email case sensitive (${playwrightSafeEmailAddress})`, async (testContext) => {
            const {page} = await e2eUtil.initTest(testContext, {
                paths: frontendPathTree.paths.children.app,
            });
            await e2eUtil.login(testContext, {
                ...mockUser,
                emailAddress,
            });

            await e2eUtil
                .expect(
                    page.getByRole('link', {
                        name: 'Admin',
                    }),
                )
                .not.toBeVisible();
            await e2eUtil.logout(testContext);
        });
    });

    it('supports self serve sign up', async (testContext) => {
        if (defaultRawUniversalConfig.selfServeSignupEnabled) {
            const {page} = await e2eUtil.initTest(testContext, {
                paths: frontendPathTree.paths.children['create-account'],
            });

            const mockUser = {
                emailAddress: [
                    randomString(16),
                    'example.com',
                ].join('@'),
                password: randomString(32),
            };

            await e2eUtil.createSelfServeUser(testContext, {
                ...mockUser,
                teamName: 'test team',
                humanName: 'test name',
            });

            await e2eUtil
                .expect(page.getByText(englishPhrases.AppEmailSuccess.accountCreatedSubtitle))
                .toBeVisible();

            const emailFile = await e2eUtil.findEmailFile(testContext, mockUser.emailAddress);
            assert.strictEquals(emailFile.toAddresses[0], mockUser.emailAddress);

            assert.matches(
                emailFile.text,
                /Verify your email address here: (.+AccountVerification)\.\s+This URL expires in 10 minutes\./,
            );

            const [
                ,
                verificationLink,
            ] = safeMatch(emailFile.text, /here: (.+)\.\s+This URL/);
            assert.isTruthy(
                verificationLink,
                `Failed to extract verification link URL from '${emailFile.text}'`,
            );

            await page.goto(verificationLink, {
                waitUntil: 'domcontentloaded',
            });

            await e2eUtil.expect(page.locator(AppUserHeader.tagName).first()).toBeVisible();
        } else {
            const {page} = await e2eUtil.initTest(testContext, {
                paths: frontendPathTree.paths.children['create-account'],
            });

            await waitUntil.lacksValue(frontendPathTree.paths.children['create-account'].path, () =>
                page.url(),
            );
        }
    });

    it('sends password reset email', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });
        const emailAddress = mockSeedUsers.customerUser.emailAddress;
        await page
            .getByRole('link', {
                name: 'Forgot your password?',
            })
            .click();
        await page
            .getByRole('textbox', {
                name: 'Email:',
            })
            .fill(emailAddress);
        await page
            .getByRole('button', {
                name: 'Reset Password',
            })
            .click();

        // Wait for the reset password email to be generated
        const emailFile = await e2eUtil.findEmailFile(testContext, emailAddress);
        assert.isDefined(emailFile);
        assert.strictEquals(emailFile.toAddresses[0], emailAddress);
        assert.matches(emailFile.text, /reset your password/i);
    });

    it('locks account after repeated failures', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        const customerEmail = mockSeedUsers.customerUser.emailAddress;
        const wrongPassword = 'wrong password that is long enough';
        const newPassword = randomString(32);

        /**
         * Attempt to log in with the wrong password 6 times to trigger lockout. The
         * `failedLoginLockoutCount` is 6.
         */
        await executeCount(6, async () => {
            await e2eUtil.login(
                testContext,
                {
                    emailAddress: customerEmail,
                    password: wrongPassword,
                },
                {
                    shouldFail: true,
                },
            );
            await page.reload();
        });

        /** After lockout, even the correct password should fail. */
        await e2eUtil.login(testContext, mockSeedUsers.customerUser, {
            shouldFail: true,
        });
        await page.reload();

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);
        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppInternalAdmin.internalAdminHeader))
            .toBeVisible();
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
        await page
            .getByTestId(AppScrollList.testIds.optionCard)
            .filter({
                hasText: mockSeedUsers.customerUser.emailAddress,
            })
            .first()
            .click();

        /** Verify the "Account is locked" message is visible. */
        await e2eUtil.expect(page.getByText(englishPhrases.AppTeamUser.userIsLocked)).toBeVisible();

        /** Set up the dialog handler before clicking to accept the confirmation prompt. */
        page.once('dialog', async (dialog) => {
            await dialog.accept();
        });

        /** Click the "Unlock user" button and confirm the dialog. */
        await page.getByText(englishPhrases.AppTeamUser.unlockUser).first().click();

        /** Wait for the lock indicator to disappear, confirming the unlock succeeded. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppTeamUser.userIsLocked))
            .not.toBeVisible();

        /** Log out the admin user. */
        await e2eUtil.logout(testContext);

        /**
         * Find the password reset email that was sent when the admin unlocked the user. The unlock
         * endpoint clears the password and sends a PasswordReset email code.
         */
        const emailFile = await e2eUtil.findEmailFile(testContext, customerEmail);
        assert.isDefined(emailFile);
        assert.strictEquals(emailFile.toAddresses[0], customerEmail);
        assert.matches(emailFile.text, /reset your password/i);

        /** Extract the verification link from the email. */
        const [
            ,
            resetLink,
        ] = safeMatch(emailFile.text, /here: (.+)\.\s+This URL/);
        assert.isTruthy(resetLink, `Failed to extract reset link URL from '${emailFile.text}'`);

        /** Navigate to the reset link. */
        await page.goto(resetLink, {
            waitUntil: 'domcontentloaded',
        });

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
            emailAddress: customerEmail,
            password: newPassword,
        });

        /** Confirm we're logged in by checking user authorization. */
        assert.isTrue(await e2eUtil.isUserAuthorized(testContext));
    });
});
