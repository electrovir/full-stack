import {getOrSet} from '@augment-vir/common';
import {DeployEnv, testNameSearchParamKey} from '@evir/common';
import {type BaseSearchParams} from '@rest-vir/define-service';
import {
    type BackendClientInterface,
    createBackendClientInterface,
} from './backend-client-interface.js';

/** Used in e2e tests to ensure that each test runs in isolation of the others. */
const backendClientInterfaceStore: Record<string, BackendClientInterface> = {};

export async function getBackendClientInterface(
    defaultBackendClientInterface: BackendClientInterface,
    searchParams: BaseSearchParams | undefined,
): Promise<BackendClientInterface> {
    if (defaultBackendClientInterface.backendEnvClient.deployEnv !== DeployEnv.Dev) {
        return defaultBackendClientInterface;
    }

    const urlTestName: string | undefined =
        searchParams?.[testNameSearchParamKey]?.[0] || undefined;

    return urlTestName
        ? await getOrSet(backendClientInterfaceStore, urlTestName, async () => {
              return await createBackendClientInterface({
                  ...defaultBackendClientInterface.backendEnvClient,
                  test: urlTestName,
              });
          })
        : defaultBackendClientInterface;
}
