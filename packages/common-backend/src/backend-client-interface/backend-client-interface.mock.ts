import {type UniversalTestContext} from '@augment-vir/test';
import {DeployEnv} from '@evir/common';
import {type DatabaseInit} from '@evir/common/src/data/database-init.mock.js';
import {prismaApi} from 'prisma-vir';
import {BackendServiceKey} from '../data/backend-service-key.js';
import {createBackendClientInterface} from './backend-client-interface.js';

export async function createMockBackendClientInterface(
    testContext: Readonly<UniversalTestContext>,
    databaseInit?: DatabaseInit,
) {
    const backendClientInterface = await createBackendClientInterface({
        deployEnv: DeployEnv.Dev,
        releaseName: 'test',
        test: testContext,
        serviceKey: BackendServiceKey.Backend,
    });

    if (databaseInit) {
        await prismaApi.client.addData({
            prismaClient: backendClientInterface.prismaClient,
            data: databaseInit,
        });
    }

    return backendClientInterface;
}
