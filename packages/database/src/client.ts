import {assert} from '@augment-vir/assert';
import {isRuntimeEnv, RuntimeEnv} from '@augment-vir/common';
import {prisma} from '@augment-vir/node';
import {type UniversalTestContext, extractTestName} from '@augment-vir/test';
import {join, resolve} from 'node:path';
import {createPgliteAdapter} from 'prisma-pglite';
import {type RequireExactlyOne} from 'type-fest';
import {buildUrl} from 'url-vir';
import {notCommittedDirPath} from './database-paths.js';
import {PrismaClient} from './generated/index.js';
import {prismaMapExtension} from './prisma/map-extension.js';

if (isRuntimeEnv(RuntimeEnv.Web)) {
    throw new Error('PrismaClient cannot be imported into the frontend (yet).');
}

export const prismaDirPath = resolve(import.meta.dirname, '..', 'prisma');
const prismaSchemaFilePath = resolve(prismaDirPath, 'schema.prisma');

export type DatabaseParams = RequireExactlyOne<{
    dev: {
        testContext?: UniversalTestContext | undefined;
        allowSeeding: boolean;
    };
    liveConnection: Readonly<DatabaseConnectionParams>;
}>;

export function createTestDatabasePath(testContext: UniversalTestContext) {
    return join(notCommittedDirPath, 'tests', extractTestName(testContext), 'db');
}

export type DatabaseConnectionParams = {
    host: string;
    dbname: string;
    username: string;
    password: string;
};

export async function createPostgresPrismaClient(
    params: Readonly<DatabaseParams>,
): Promise<PrismaClient> {
    const allowSeeding: boolean = 'dev' in params && params.dev.allowSeeding;

    const pgliteAdapter =
        'dev' in params
            ? await createPgliteAdapter({
                  schemaFilePath: prismaSchemaFilePath,
                  testContext: params.dev.testContext,
              })
            : undefined;

    const basePrismaClient = pgliteAdapter
        ? new PrismaClient({
              adapter: pgliteAdapter,
          })
        : params.liveConnection
          ? new PrismaClient({datasourceUrl: createLiveDatabaseUrl(params.liveConnection)})
          : undefined;

    assert.isDefined(basePrismaClient, 'Failed to configure PrismaClient.');

    const prismaClient = basePrismaClient.$extends(prismaMapExtension) as PrismaClient;

    if (pgliteAdapter?.wasJustInitialized && allowSeeding) {
        await seedDatabase(prismaClient);
    }

    return prismaClient;
}

async function seedDatabase(prismaClient: Readonly<PrismaClient>) {
    const user = await prismaClient.user.findFirst();

    const {seedData} = await import('./prisma/seed.js');

    if (user) {
        throw new Error('Cannot seed a database with existing data.');
    }

    await prisma.client.addData(prismaClient, seedData);
}

function createLiveDatabaseUrl(connectionParams: Readonly<DatabaseConnectionParams>): string {
    if (!connectionParams.host) {
        throw new Error(`Cannot connect to database without a host.`);
    }

    return buildUrl({
        hostname: connectionParams.host,
        protocol: 'postgresql',
        port: 5432,
        paths: [connectionParams.dbname],
        username: connectionParams.username,
        password: connectionParams.password,
    }).href;
}
