import {describe, it} from '@augment-vir/test';
import {frontendPathTree} from '@evir/common';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../data/translations/en.js';
import {AppFeedback} from './app-feedback.element.js';
import {AppUserHeader} from './app-user-header.element.js';

describe(AppFeedback.tagName, () => {
    it('opens the feedback modal from the user dropdown', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** Open the user dropdown. */
        await page.locator(AppUserHeader.tagName).first().click();

        /** Click Feedback. */
        await e2eUtil
            .getMenuOption(testContext, {
                name: 'Feedback',
            })
            .first()
            .click();

        /** Verify the feedback modal opens. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppUserHeader.feedbackModalHeader))
            .toBeVisible();

        /** Verify the feedback textarea label is visible. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppFeedback.feedbackInputLabel))
            .toBeVisible();

        /** Verify Submit and Cancel buttons are visible. */
        await e2eUtil
            .expect(
                page
                    .getByRole('button', {
                        name: englishPhrases.AppFeedback.submitFeedbackButton,
                    })
                    .first(),
            )
            .toBeVisible();
        await e2eUtil
            .expect(
                page
                    .getByRole('button', {
                        name: englishPhrases.AppFeedback.cancelFeedbackButton,
                    })
                    .first(),
            )
            .toBeVisible();
    });

    it('can cancel the feedback modal', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** Open the user dropdown. */
        await page.locator(AppUserHeader.tagName).first().click();

        /** Click Feedback. */
        await e2eUtil
            .getMenuOption(testContext, {
                name: 'Feedback',
            })
            .first()
            .click();

        /** Verify the feedback modal is open. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppUserHeader.feedbackModalHeader))
            .toBeVisible();

        /** Click Cancel. */
        await page
            .getByRole('button', {
                name: englishPhrases.AppFeedback.cancelFeedbackButton,
            })
            .first()
            .click();

        /** Verify the feedback modal is closed. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppUserHeader.feedbackModalHeader))
            .not.toBeVisible();
    });

    it('submits feedback successfully', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        /** Open the user dropdown. */
        await page.locator(AppUserHeader.tagName).first().click();

        /** Click Feedback. */
        await e2eUtil
            .getMenuOption(testContext, {
                name: 'Feedback',
            })
            .first()
            .click();

        /** Type feedback into the textarea. */
        const feedbackInput = page.locator('textarea').first();
        await e2eUtil.expect(feedbackInput).toBeVisible();
        await feedbackInput.fill('This is e2e test feedback.');

        /** Click Submit. */
        await page
            .getByRole('button', {
                name: englishPhrases.AppFeedback.submitFeedbackButton,
            })
            .first()
            .click();

        /** Verify the success message appears. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppFeedback.feedbackSubmittedSuccessfully))
            .toBeVisible();
    });
});
