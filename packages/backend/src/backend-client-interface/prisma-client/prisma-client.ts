import {assert} from '@augment-vir/assert';
import {assertTestContext, RuntimeEnv, type UniversalTestContext} from '@augment-vir/test';
import {prismaSchemaFilePath} from '@evir/common-backend';
import {PrismaClient} from '@evir/database';
import {createPrismaMapExtension, type PrismaValueMapper} from 'prisma-map';
import {createPgliteAdapter} from 'prisma-pglite';
import {type RequireExactlyOne} from 'type-fest';
import {buildUrl} from 'url-vir';
import {type SecretsClient} from '../secrets-client/secrets-client.js';

const mappers: ReadonlyArray<PrismaValueMapper> = [
    (value) => {
        if (value instanceof Date) {
            return {
                replacement: value.toISOString(),
            };
        } else {
            return undefined;
        }
    },
];

export const prismaMapExtension = createPrismaMapExtension(mappers);

export async function createPrismaClient(
    params: RequireExactlyOne<{
        dev: UniversalTestContext | undefined;
        nonDev: Readonly<SecretsClient>;
    }>,
) {
    const basePrismaClient =
        'dev' in params
            ? new PrismaClient({
                  adapter: await createPgliteAdapter({
                      schemaFilePath: prismaSchemaFilePath,
                      testContext: params.dev,
                  }),
              })
            : new PrismaClient({datasourceUrl: createLiveDatabaseUrl(params.nonDev)});

    const prismaClient = basePrismaClient.$extends(prismaMapExtension) as PrismaClient;

    if (params.dev) {
        assertTestContext(params.dev, RuntimeEnv.Node);
        params.dev.after(async () => {
            await prismaClient.$disconnect();
        });
    }
    /** Verify that the database connection is functioning. */
    assert.isTruthy(await prismaClient.$queryRaw`SELECT 1`);

    return prismaClient;
}

function createLiveDatabaseUrl(secretsClient: Readonly<SecretsClient>): string {
    if (!secretsClient.get.database.host) {
        return '';
    }

    return buildUrl({
        hostname: secretsClient.get.database.host,
        protocol: 'postgresql',
        port: 5432,
        paths: [secretsClient.get.database.dbname],
        username: secretsClient.get.database.username,
        password: secretsClient.get.database.password,
    }).href;
}
