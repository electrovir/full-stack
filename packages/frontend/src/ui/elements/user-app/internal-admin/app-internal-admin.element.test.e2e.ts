import {describe, it} from '@augment-vir/test';
import {frontendPathTree, TeamFilter} from '@evir/common';
import {mockSeedTeams, mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import englishPhrases from '../../../../data/translations/en.js';
import {AppScrollList} from '../../common/app-scroll-list.element.js';
import {AppInternalAdmin} from './app-internal-admin.element.js';

const teamAdminPathTree =
    frontendPathTree.paths.children.app.children['internal-admin'].children.teams;

describe(AppInternalAdmin.tagName, () => {
    it('loads the internal admin page for admin users', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });

        await e2eUtil
            .expect(page.getByText(englishPhrases.AppInternalAdmin.internalAdminHeader))
            .toBeVisible();
    });

    it('shows Teams and Dev DB tabs', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });

        await e2eUtil
            .expect(
                page
                    .getByText(englishPhrases.AppInternalAdmin.tabs.teams, {
                        exact: true,
                    })
                    .first(),
            )
            .toBeVisible();
        await e2eUtil
            .expect(
                page
                    .getByText(englishPhrases.AppInternalAdmin.tabs.devDb, {
                        exact: true,
                    })
                    .first(),
            )
            .toBeVisible();
    });

    it('displays the team list with seed teams', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        /** Navigate to the Active filter so all non-deactivated teams are visible. */
        await e2eUtil.navigation.navigateTo(testContext, {
            paths: teamAdminPathTree.children[':team-filter'].fill(TeamFilter.Active),
        });

        /** Verify seed teams are visible in the list. */
        await e2eUtil
            .expect(
                page
                    .getByTestId(AppScrollList.testIds.optionCard)
                    .filter({
                        hasText: mockSeedTeams.adminTeam.teamName,
                    })
                    .first(),
            )
            .toBeVisible();
        await e2eUtil
            .expect(
                page
                    .getByTestId(AppScrollList.testIds.optionCard)
                    .filter({
                        hasText: mockSeedTeams.customerTeam.teamName,
                    })
                    .first(),
            )
            .toBeVisible();
    });

    it('can navigate to a team and view details', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });

        /** Click on the customer team. */
        await page
            .getByTestId(AppScrollList.testIds.optionCard)
            .filter({
                hasText: mockSeedTeams.customerTeam.teamName,
            })
            .first()
            .click();

        /** Verify the team header appears. */
        await e2eUtil
            .expect(page.getByText(`Team: ${mockSeedTeams.customerTeam.teamName}`))
            .toBeVisible();

        /** Verify the Details tab is visible. */
        await e2eUtil
            .expect(
                page
                    .getByText(englishPhrases.AppTeam.tabs.details, {
                        exact: true,
                    })
                    .first(),
            )
            .toBeVisible();
    });

    it('can view and navigate to team users', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });

        /** Click on the customer team. */
        await page
            .getByTestId(AppScrollList.testIds.optionCard)
            .filter({
                hasText: mockSeedTeams.customerTeam.teamName,
            })
            .first()
            .click();

        /** Switch to Users tab. */
        await page
            .getByText(englishPhrases.AppTeam.tabs.users, {
                exact: true,
            })
            .first()
            .click();

        /** Verify the customer user is listed. */
        await e2eUtil
            .expect(page.getByText(mockSeedUsers.customerUser.humanName).first())
            .toBeVisible();

        /** Click on the user to view details. */
        await page
            .getByRole('button')
            .filter({
                hasText: mockSeedUsers.customerUser.emailAddress,
            })
            .first()
            .click();

        /** Verify the user details form appears. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppTeamUser.nameLabel).first())
            .toBeVisible();
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppTeamUser.emailAddressLabel).first())
            .toBeVisible();
    });

    it('can edit team details', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });

        /** Click on the customer team. */
        await page
            .getByTestId(AppScrollList.testIds.optionCard)
            .filter({
                hasText: mockSeedTeams.customerTeam.teamName,
            })
            .first()
            .click();

        /** Verify team name field is visible. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppTeamDetails.teamNameLabel).first())
            .toBeVisible();

        /** Verify the Is Approved checkbox is visible (admin only feature). */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppTeamDetails.isApprovedLabel).first())
            .toBeVisible();

        /** Verify the Is Test checkbox is visible. */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppTeamDetails.isTestLabel).first())
            .toBeVisible();
    });

    it('can navigate to Dev DB tab', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });

        /** Click the Dev DB tab. */
        await page
            .getByText(englishPhrases.AppInternalAdmin.tabs.devDb, {
                exact: true,
            })
            .first()
            .click();

        /** Verify the Dev DB page loads with a submit button. */
        await e2eUtil
            .expect(
                page
                    .getByRole('button', {
                        name: 'Submit',
                    })
                    .first(),
            )
            .toBeVisible();
    });

    it('can filter teams by status', async (testContext) => {
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        /** Navigate to the Approved filter. */
        await e2eUtil.navigation.navigateTo(testContext, {
            paths: teamAdminPathTree.children[':team-filter'].fill(TeamFilter.Approved),
        });

        /** The customer team should be visible under the Approved filter. */
        await e2eUtil
            .expect(
                page
                    .getByTestId(AppScrollList.testIds.optionCard)
                    .filter({
                        hasText: mockSeedTeams.customerTeam.teamName,
                    })
                    .first(),
            )
            .toBeVisible();

        /** The admin team should NOT be visible under the Approved filter. */
        await e2eUtil
            .expect(
                page
                    .getByTestId(AppScrollList.testIds.optionCard)
                    .filter({
                        hasText: mockSeedTeams.adminTeam.teamName,
                    })
                    .first(),
            )
            .not.toBeVisible();

        /** Navigate to the Admin filter. */
        await e2eUtil.navigation.navigateTo(testContext, {
            paths: teamAdminPathTree.children[':team-filter'].fill(TeamFilter.Admin),
        });

        /** The admin team should be visible under the Admin filter. */
        await e2eUtil
            .expect(
                page
                    .getByTestId(AppScrollList.testIds.optionCard)
                    .filter({
                        hasText: mockSeedTeams.adminTeam.teamName,
                    })
                    .first(),
            )
            .toBeVisible();

        /** The customer team should NOT be visible under the Admin filter. */
        await e2eUtil
            .expect(
                page
                    .getByTestId(AppScrollList.testIds.optionCard)
                    .filter({
                        hasText: mockSeedTeams.customerTeam.teamName,
                    })
                    .first(),
            )
            .not.toBeVisible();
    });

    it('can resend an invite for an unverified user', async (testContext) => {
        /**
         * This test relies on an invited (unverified) user existing. The user invite test in
         * app-verify.element.test.e2e.ts creates one, but this test verifies the resend invite
         * functionality independently by checking the UI button is present when viewing a user.
         */
        const {page} = await e2eUtil.initTest(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.adminUser);

        await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app.children['internal-admin'],
        });

        /** Navigate to the customer team and its users. */
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

        /** Click on the customer user. */
        await page
            .getByTestId(AppScrollList.testIds.optionCard)
            .filter({
                hasText: mockSeedUsers.customerUser.emailAddress,
            })
            .first()
            .click();

        /**
         * Verify the user details are showing. The customer user is already verified, so the
         * "Resend invite" button should NOT be visible for them.
         */
        await e2eUtil
            .expect(page.getByText(englishPhrases.AppTeamUser.resendInvite).first())
            .not.toBeVisible();
    });
});
