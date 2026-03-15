import {type MaybePromise} from '@augment-vir/common';
import {DeployEnv, testNameSearchParamKey} from '@evir/common';
import {type BaseSearchParams} from '@rest-vir/define-service';
import {
    type BackendClientInterface,
    createBackendClientInterface,
} from './backend-client-interface.js';

/** Only used in e2e tests. */
const backendClientInterfaceStore: Record<string, Promise<BackendClientInterface>> = {};

export function getBackendClientInterface(
    defaultBackendClientInterface: BackendClientInterface,
    searchParams: BaseSearchParams | undefined,
): MaybePromise<BackendClientInterface> {
    if (defaultBackendClientInterface.backendEnvClient.deployEnv !== DeployEnv.Dev) {
        return defaultBackendClientInterface;
    }

    const urlTestName: string | undefined =
        searchParams?.[testNameSearchParamKey]?.[0] || undefined;

    if (urlTestName) {
        const existingPromise = backendClientInterfaceStore[urlTestName];
        if (existingPromise) {
            return existingPromise;
        }

        const newClientInterface = createBackendClientInterface({
            ...defaultBackendClientInterface.backendEnvClient,
            test: urlTestName,
        });
        backendClientInterfaceStore[urlTestName] = newClientInterface;

        return newClientInterface;
    } else {
        return defaultBackendClientInterface;
    }
}
