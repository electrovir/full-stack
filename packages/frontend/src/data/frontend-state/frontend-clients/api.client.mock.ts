import {defineBackendService, DeployEnv, type BackendApi} from '@evir/common';
import {generateApi, makeMockApi, type RestVirApiMocks} from '@rest-vir/define-service';
import {type FrontendEnvClient} from './frontend-env.client.js';

export type MockApiFetch = RestVirApiMocks<BackendApi, any>['fetch'];

export function createMockApiClient({
    frontendEnvClient,
    mockFetch,
}: Readonly<{
    frontendEnvClient: Readonly<FrontendEnvClient>;
    mockFetch: MockApiFetch | undefined;
}>): BackendApi {
    const api: BackendApi = generateApi(
        defineBackendService(DeployEnv.Dev, frontendEnvClient.universalConfig, []),
    );

    return makeMockApi(api, {
        fetch:
            mockFetch ||
            (() => {
                throw new Error('No mock fetch implemented.');
            }),
    });
}
