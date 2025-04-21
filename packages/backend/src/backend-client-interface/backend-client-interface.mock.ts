import {type UniversalTestContext} from '@augment-vir/test';
import {DeployEnv} from '@evir/common';
import {createBackendClientInterface} from './backend-client-interface.js';

export async function createMockBackendClientInterface(testContext: UniversalTestContext) {
    return await createBackendClientInterface({
        deployEnv: DeployEnv.Dev,
        releaseName: 'test',
        testContext,
    });
}
