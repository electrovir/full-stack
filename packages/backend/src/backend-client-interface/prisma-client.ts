import {assert} from '@augment-vir/assert';
import {RuntimeEnv} from '@augment-vir/common';
import {assertTestContext, type UniversalTestContext} from '@augment-vir/test';
import {DeployEnv} from '@evir/common';
import {createPostgresPrismaClient, type DatabaseParams} from '@evir/database';
import {type SecretsClient} from './secrets-client/secrets-client.js';

export async function createPrismaClient(
    params: Readonly<
        | {
              test: UniversalTestContext;
          }
        | {
              secretsClient: Readonly<SecretsClient>;
              env: DeployEnv;
          }
    >,
) {
    const env: DeployEnv | undefined = 'env' in params ? params.env : undefined;

    const databaseParams: DatabaseParams =
        'test' in params
            ? {
                  dev: {
                      testContext: params.test,
                      allowSeeding: false,
                  },
              }
            : env === DeployEnv.Dev
              ? {
                    dev: {
                        testContext: undefined,
                        allowSeeding: true,
                    },
                }
              : {
                    liveConnection: params.secretsClient.get.database,
                };

    const prismaClient = await createPostgresPrismaClient(databaseParams);

    if ('test' in params) {
        assertTestContext(params.test, RuntimeEnv.Node);
        params.test.after(async () => {
            await prismaClient.$disconnect();
        });
    }
    /** Verify that the database connection is functioning. */
    assert.isDefined(await prismaClient.$executeRaw`SELECT 1;`);

    return prismaClient;
}
