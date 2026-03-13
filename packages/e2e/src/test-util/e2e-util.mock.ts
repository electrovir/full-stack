import {testPlaywright} from '@augment-vir/test';
import {e2eTestName} from '@evir/common';
import {expect} from '@playwright/test';
import {sendBackendRequest} from './e2e-backend-request.mock.js';
import {createSelfServeUser} from './e2e-create-user.mock.js';
import {findEmailFile} from './e2e-email.mock.js';
import {initE2eTest} from './e2e-init-test.mock.js';
import {
    createLoginScreenLocator,
    e2eLogin,
    getLoginElements,
    isUserAuthorized,
} from './e2e-login.mock.js';
import {e2eLogout} from './e2e-logout.mock.js';
import {e2eNavigateTo} from './e2e-navigate.mock.js';
import {assertSizedScreenshots} from './e2e-sized-screenshots.mock.js';
import {createFullE2eTestName} from './e2e-test-name.mock.js';
import {getE2eBackendUrl, getE2eFrontendUrl} from './e2e-urls.mock.js';

export const e2eUtil = {
    sendBackendRequest,
    createSelfServeUser,
    findEmailFile,
    createLoginScreenLocator,
    getLoginElements,
    login: e2eLogin,
    expect,
    logout: e2eLogout,
    isUserAuthorized,
    assertSizedScreenshots,
    createFullE2eTestName,
    e2eTestName,
    getFrontendUrl: getE2eFrontendUrl,
    getBackendUrl: getE2eBackendUrl,
    ...testPlaywright,
    initTest: initE2eTest,
    navigation: {
        ...testPlaywright.navigation,
        navigateTo: e2eNavigateTo,
    },
};
