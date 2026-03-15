import {check} from '@augment-vir/assert';
import {assertTestContext, TestEnv, type UniversalTestContext} from '@augment-vir/test';
import {csrfHeaderName, testNameSearchParamKey, type FrontendSearchParams} from '@evir/common';
import {buildUrl, parseUrl} from 'url-vir';
import {createFullE2eTestName} from './e2e-test-name.mock.js';
import {getE2eBackendUrl, getE2eFrontendUrl} from './e2e-urls.mock.js';

// cspell:word keyvaluepairs
/**
 * Reads the CSRF token from IndexedDB where auth-vir stores it (database: 'auth-vir-csrf', store:
 * 'keyvaluepairs', key: 'csrfToken').
 */
async function readCsrfToken(
    testContext: Readonly<UniversalTestContext>,
): Promise<string | undefined> {
    assertTestContext(testContext, TestEnv.Playwright);

    return await testContext.page.evaluate(async () => {
        return await new Promise<string | undefined>((resolve) => {
            const request = indexedDB.open('auth-vir-csrf');
            request.onerror = () => resolve(undefined);
            request.onsuccess = () => {
                const db = request.result;
                try {
                    const transaction = db.transaction('keyvaluepairs', 'readonly');
                    const store = transaction.objectStore('keyvaluepairs');
                    const getRequest = store.get('csrfToken');
                    getRequest.onsuccess = () => {
                        const raw: string | undefined = getRequest.result || undefined;
                        if (!raw) {
                            resolve(undefined);
                            return;
                        }
                        try {
                            const parsed: {token: string} = JSON.parse(raw);
                            resolve(parsed.token || undefined);
                        } catch {
                            resolve(undefined);
                        }
                    };
                    getRequest.onerror = () => resolve(undefined);
                } catch {
                    resolve(undefined);
                }
            };
        });
    });
}

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

    const csrfToken = await readCsrfToken(testContext);

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
