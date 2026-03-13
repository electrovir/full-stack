import {check} from '@augment-vir/assert';
import {
    assertTestContext,
    TestEnv,
    testPlaywright,
    type UniversalTestContext,
} from '@augment-vir/test';
import {csrfHeaderName, testNameSearchParamKey, type FrontendSearchParams} from '@evir/common';
import {buildUrl, parseUrl} from 'url-vir';
import {createFullE2eTestName} from './e2e-test-name.mock.js';
import {getE2eBackendUrl, getE2eFrontendUrl} from './e2e-urls.mock.js';

export async function sendBackendRequest(
    this: void,
    testContext: Readonly<UniversalTestContext>,
    path: string[] | string,
) {
    assertTestContext(testContext, TestEnv.Playwright);
    const backendUrl = getE2eBackendUrl();
    const frontendUrl = getE2eFrontendUrl();

    const url = buildUrl(backendUrl, {
        ...(check.isArray(path)
            ? {
                  paths: path,
              }
            : {
                  pathname: path,
              }),
        search: {
            [testNameSearchParamKey]: [createFullE2eTestName(testContext)],
        } satisfies FrontendSearchParams,
    }).href;

    const csrfToken = await testPlaywright.readLocalStorage(testContext, csrfHeaderName);

    const headers = {
        Origin: parseUrl(frontendUrl).origin, // simulate frontend origin
        'Sec-Fetch-Site': 'same-site',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        Accept: 'application/json',
        ...(csrfToken
            ? {
                  [csrfHeaderName]: csrfToken,
              }
            : {}),
    };

    return await testContext.page.request.get(url, {
        headers,
    });
}
