import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {DeployEnv} from '@evir/common';
import {createPrismaClient} from './prisma.client.js';

describe(createPrismaClient.name, () => {
    it('creates a functional database', async (testContext) => {
        const prismaClient = await createPrismaClient({
            deployEnv: DeployEnv.Dev,
            test: testContext,
        });

        const result = await prismaClient.$executeRaw`SELECT 1;`;

        assert.isDefined(result);
    });
});
