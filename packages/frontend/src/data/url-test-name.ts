import {DeployEnv, testNameSearchParamKey, type FrontendRoute} from '@evir/common';
import {buildUrl} from 'url-vir';

export function insertUrlTestName(
    originalUrl: string,
    deployEnv: DeployEnv,
    currentRoute: Readonly<FrontendRoute>,
): string {
    if (deployEnv !== DeployEnv.Dev) {
        return originalUrl;
    }

    const testName = currentRoute.search?.testName?.[0];

    if (!testName) {
        return originalUrl;
    }

    return buildUrl(originalUrl, {
        search: {
            [testNameSearchParamKey]: [testName],
        },
    }).href;
}
