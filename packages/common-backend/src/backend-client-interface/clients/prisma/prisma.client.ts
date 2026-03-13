import {assert, check} from '@augment-vir/assert';
import {assertTestContext, TestEnv, type UniversalTestContext} from '@augment-vir/test';
import {allMockSeedData} from '@evir/common/src/data/dev-seed-data.mock.js';
import {DeployEnv} from '@evir/common/src/deploy-env.js';
import {PrismaClient} from '@evir/database/src/for-backend.js';
import {cp} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {
    createIsoDatesPrismaExtension,
    createPrefixedIdExtension,
    createPrismaClient as createPrismaClientVir,
    prismaApi,
    PrismaDatabaseEngine,
} from 'prisma-vir';
import {
    prismaMigrationsDirPath,
    prismaSchemaFilePath,
    productionDatabaseFilePath,
} from '../../../data/file-paths.js';

export async function createPrismaClient({
    deployEnv,
    test,
}: {
    deployEnv: DeployEnv;
    test?: UniversalTestContext | string | undefined;
}) {
    const {prismaClient, databasePath} = await createPrismaClientVir(
        PrismaDatabaseEngine.Sqlite,
        PrismaClient,
        {
            migrationsDirPath: prismaMigrationsDirPath,
            schemaPath: prismaSchemaFilePath,
            connection:
                deployEnv === DeployEnv.Dev
                    ? {
                          dev: {
                              resetDatabase: !!test,
                              test,
                          },
                      }
                    : {
                          liveConnection: {
                              filePath: productionDatabaseFilePath,
                          },
                      },
            extendScript({prismaClient}) {
                return prismaClient
                    .$extends(createPrefixedIdExtension())
                    .$extends(createIsoDatesPrismaExtension());
            },
            async seedScript({prismaClient}) {
                if (
                    await prismaClient.team.findFirst({
                        select: {
                            id: true,
                        },
                    })
                ) {
                    throw new Error('Cannot seed a database with existing data.');
                }

                await prismaApi.client.addData({
                    prismaClient,
                    data: allMockSeedData,
                });
            },
        },
    );
    if (test && !check.isString(test)) {
        assertTestContext(test, TestEnv.Node);
        test.after(async () => {
            await prismaClient.$disconnect();
        });
    }

    assert.isDefined(databasePath, 'No database path found.');

    await cp(databasePath, join(dirname(databasePath), 'backups', `backup-${Date.now()}.db`));

    assert.isDefined(
        await prismaClient.team.findFirst({
            select: {
                id: true,
            },
        }),
    );

    return prismaClient;
}
