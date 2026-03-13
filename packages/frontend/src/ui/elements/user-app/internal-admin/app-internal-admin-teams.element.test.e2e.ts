import {randomString} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {frontendPathTree} from '@evir/common';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../../data/translations/en.js';
import {AppInternalAdminTeams} from './app-internal-admin-teams.element.js';

describe(AppInternalAdminTeams.tagName, () => {
    it('creates a new team', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        const newTeamName = `E2E Test Team ${randomString(8)}`;

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        /** Navigate to the internal admin page. */
        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });

        await e2eUtil
            .expect(page.getByText(englishPhrases.AppInternalAdmin.internalAdminHeader))
            .toBeVisible();

        /** Click the "Create Team" button. */
        await page
            .getByText(englishPhrases.AppInternalAdminTeams.createTeamButtonText)
            .first()
            .click();

        /** Verify the "New Team" header is visible. */
        await e2eUtil.expect(page.getByText(englishPhrases.AppTeam.newTeam)).toBeVisible();

        /** Fill in the team name. */
        await e2eUtil.enterTextByLabel(testContext, {
            label: englishPhrases.AppTeamDetails.teamNameLabel,
            text: newTeamName,
        });

        /** Click the Save button. */
        await page
            .getByRole('button', {
                name: englishPhrases.AppTeamDetails.saveTeamEditsButtonText,
            })
            .first()
            .click();

        /** After saving, the app should navigate to the newly created team's details page. */
        await e2eUtil.expect(page.getByText('Team:')).toBeVisible();

        /** Verify the new team also appears in the team list sidebar. */
        await e2eUtil.expect(page.getByText(newTeamName).first()).toBeVisible();
    });
});
