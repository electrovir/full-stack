import {mergeDeep, wait} from '@augment-vir/common';
import {
    CustomHeader,
    defineBackendService,
    DeployEnv,
    type AssumedUser,
    type BackendApi,
    type FrontendRouter,
} from '@evir/common';
import {generateApi, mapServiceDevPort} from '@rest-vir/define-service';
import {type FrontendAuthClient} from 'auth-vir';
import {insertUrlTestName} from '../../url-test-name.js';
import {type FrontendEnvClient} from './frontend-env.client.js';
import {type AppLocalStorageClient} from './local-storage.client.js';

export async function createApiClient({
    frontendEnvClient,
    frontendAuthClient,
    router,
    localStorageClient,
}: Readonly<{
    frontendEnvClient: Readonly<FrontendEnvClient>;
    frontendAuthClient: FrontendAuthClient<AssumedUser>;
    router: FrontendRouter;
    localStorageClient: Readonly<AppLocalStorageClient>;
}>): Promise<BackendApi> {
    try {
        const service = frontendEnvClient.backendPort
            ? defineBackendService(
                  frontendEnvClient.deployEnv,
                  mergeDeep(frontendEnvClient.universalConfig, {
                      services: {
                          backend: {
                              port: frontendEnvClient.backendPort,
                          },
                      },
                  }),
                  [window.location.hostname],
              )
            : await mapServiceDevPort(
                  defineBackendService(
                      frontendEnvClient.deployEnv,
                      frontendEnvClient.universalConfig,
                      [window.location.hostname],
                  ),
              );

        return generateApi(service, {
            endpointFetch: {
                async fetch(url, init) {
                    if (frontendEnvClient.deployEnv === DeployEnv.Dev) {
                        /** Simulate network delays. */
                        await wait({
                            seconds: 0.2,
                        });
                    }

                    const selectedTeamId = localStorageClient.get.selectedTeamId();

                    const combinedInit = mergeDeep(
                        init,
                        frontendAuthClient.createAuthenticatedRequestInit(),
                        {
                            headers: {
                                [CustomHeader.FrontendSource]: window.location.href,
                                ...(selectedTeamId
                                    ? {
                                          [CustomHeader.SelectedTeamId]: selectedTeamId,
                                      }
                                    : {}),
                            },
                        },
                    );

                    const response = await globalThis.fetch(
                        insertUrlTestName(
                            url,
                            frontendEnvClient.deployEnv,
                            router.readCurrentRoute(),
                        ),
                        combinedInit,
                    );

                    await frontendAuthClient.verifyResponseAuth(response);

                    return response;
                },
            },
        });
    } catch {
        throw new Error(`Failed to connect. Please check your internet connection.`);
    }
}

export type ApiClient = Awaited<ReturnType<typeof createApiClient>>;
