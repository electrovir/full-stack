import {check} from '@augment-vir/assert';
import {type UniversalTestContext} from '@augment-vir/test';
import {extractTestNameAsDir} from '@augment-vir/test/dist/augments/universal-testing-suite/universal-test-context.js';
import {mapUniversalConfig, type RawUniversalConfig} from '@evir/common';
import {determineFrontendDeployEnv} from '../determine-deploy-env.js';
import {readInjectedGlobalData, setGlobalData} from '../global-data.js';

export function createFrontendEnvClient(
    rawUniversalConfig: Readonly<RawUniversalConfig>,
    test: Readonly<UniversalTestContext> | string | undefined,
) {
    const testName: string | undefined = check.isString(test)
        ? test
        : test
          ? extractTestNameAsDir(test)
          : undefined;

    const deployEnv = determineFrontendDeployEnv(globalThis.location.hostname, rawUniversalConfig);

    const frontendEnvClient = {
        testName,
        deployEnv,
        universalConfig: mapUniversalConfig(deployEnv, rawUniversalConfig),
        ...readInjectedGlobalData(),
    };

    setGlobalData({
        deployEnv: frontendEnvClient.deployEnv,
        release: frontendEnvClient.release,
    });

    return frontendEnvClient;
}
export type FrontendEnvClient = ReturnType<typeof createFrontendEnvClient>;
