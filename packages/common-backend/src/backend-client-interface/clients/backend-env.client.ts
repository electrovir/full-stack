import {check} from '@augment-vir/assert';
import {filterMap, getObjectTypedValues, type PartialWithUndefined} from '@augment-vir/common';
import {runShellCommand} from '@augment-vir/node';
import {type UniversalTestContext} from '@augment-vir/test';
import {extractTestNameAsDir} from '@augment-vir/test/dist/augments/universal-testing-suite/universal-test-context.js';
import {
    defaultRawUniversalConfig,
    defineBackendService,
    DeployEnv,
    mapUniversalConfig,
    type RawUniversalConfig,
} from '@evir/common';
import {networkInterfaces} from 'node:os';
import {type BackendConfig, defaultBackendConfig} from '../../data/backend-config.js';
import {type BackendServiceKey} from '../../data/backend-service-key.js';

export type BackendEnvClientParams = {
    /** The environment that the current backend has been released to. */
    deployEnv: DeployEnv;
    serviceKey: BackendServiceKey;
} & PartialWithUndefined<{
    /** The name of the current release. This is typically a git commit hash. */
    releaseName: string;
    test: Readonly<UniversalTestContext> | string;
    /** @default defaultBackendConfig */
    backendConfig: Readonly<BackendConfig>;
    rawUniversalConfig: Readonly<RawUniversalConfig>;
}>;

export async function createBackendEnvClient({
    test,
    backendConfig = defaultBackendConfig,
    rawUniversalConfig = defaultRawUniversalConfig,
    releaseName,
    ...params
}: BackendEnvClientParams) {
    const universalConfig = mapUniversalConfig(params.deployEnv, rawUniversalConfig);

    return {
        ...params,
        releaseName:
            releaseName || (await runShellCommand('git rev-parse HEAD')).stdout.trim() || 'UNKNOWN',
        backendConfig,
        testName: cleanTestName(test),
        /** This is set by the server startup script. */
        serverPort: -1,
        universalConfig,
        backendService: defineBackendService(
            params.deployEnv,
            universalConfig,
            getDevHostNames(params.deployEnv),
        ),
    };
}
export type BackendEnvClient = Awaited<ReturnType<typeof createBackendEnvClient>>;

export function cleanTestName(test: Readonly<UniversalTestContext> | string | undefined) {
    return test ? (check.isString(test) ? test : extractTestNameAsDir(test)) : undefined;
}

function getDevHostNames(deployEnv: DeployEnv): string[] {
    if (deployEnv !== DeployEnv.Dev) {
        return [];
    }

    return filterMap(
        getObjectTypedValues(networkInterfaces()).flat(),
        (networkInterface) => networkInterface?.address,
        (address, networkInterface): address is NonNullable<typeof address> =>
            !!address &&
            !!networkInterface &&
            networkInterface.family === 'IPv4' &&
            !networkInterface.internal,
    );
}
