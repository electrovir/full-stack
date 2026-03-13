import {describe, it} from '@augment-vir/test';
import {frontendPathTree} from '@evir/common';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {e2eUtil} from '@evir/e2e';
import {AppHeader} from './app-header.element.js';
import {AppUserHeader} from './app-user-header.element.js';

describe(AppHeader.tagName, () => {
    it('shows the full dropdown', async (testContext) => {
        const {page} = await e2eUtil.navigation.navigateTo(testContext, {
            paths: frontendPathTree.paths.children.app,
        });

        await e2eUtil.login(testContext, mockSeedUsers.customerUser);

        await page.locator(AppUserHeader.tagName).waitFor({
            state: 'visible',
        });

        await page.locator(AppUserHeader.tagName).click();

        await e2eUtil
            .getMenuOption(testContext, {
                name: 'Logout',
            })
            .waitFor({
                state: 'visible',
            });

        await e2eUtil.screenshot.expectScreenshot(testContext, {
            screenshotBaseName: 'user-drop-down',
        });
    });
});
