import {
    arrayToObject,
    diffObjects,
    filterObject,
    mapObject,
    mapObjectValues,
    omitObjectKeys,
    setFirstLetterCasing,
    StringCase,
    type AnyObject,
    type MaybePromise,
    type PartialWithUndefined,
    type PrismaBasicModel,
} from '@augment-vir/common';
import {type ModelName, type Prisma, type PrismaClient} from '@evir/common';
import {type DatabaseInit} from '@evir/common/src/data/database-init.mock.js';
import {createUtcFullDate, toTimestamp} from 'date-vir';
import {prismaApi, type PrismaDumpOutput} from 'prisma-vir';
import {type BackendClientInterface} from '../backend-client-interface/backend-client-interface.js';

export type PartialDatabaseDump = Partial<{
    [Model in ModelName]: Partial<PrismaBasicModel<Prisma.TypeMap, Model>>[];
}>;

export type DatabaseDiff = Readonly<
    Partial<{
        removed: Readonly<PartialDatabaseDump>;
        added: Readonly<PartialDatabaseDump>;
    }>
>;

/** These keys have values that are too unstable to test for (like random ids or timestamps). */
const keysToRemove = [
    'id',
    'createdAt',
    'updatedAt',
    'clientIp',
    'accountLockedAt',
    'emailCodeId',
];

type ObjectDatabaseDump = {
    [Model in ModelName]: Record<string, PrismaBasicModel<Prisma.TypeMap, Model>>;
};

function dumpToObjects(dump: PrismaDumpOutput<Prisma.TypeMap>): ObjectDatabaseDump {
    return mapObject(
        dump,
        (
            modelName,
            rowArray,
        ): {key: string; value: Record<string, PrismaBasicModel<Prisma.TypeMap, any>>} => {
            return {
                key: setFirstLetterCasing(modelName, StringCase.Upper),
                value: arrayToObject(rowArray as {id: string}[], (entry) => {
                    return {
                        key: entry.id,
                        value: entry as any,
                    };
                }),
            };
        },
    ) as ObjectDatabaseDump;
}

function dumpObjectsBackToArrays(dump: ObjectDatabaseDump): PartialDatabaseDump {
    return filterObject(
        mapObjectValues(
            dump,
            (modelName, rowObjects): Partial<PrismaBasicModel<Prisma.TypeMap, any>>[] => {
                return Object.values(rowObjects)
                    .sort(
                        (a, b) =>
                            toTimestamp(createUtcFullDate(b.createdAt)) -
                            toTimestamp(createUtcFullDate(a.createdAt)),
                    )
                    .map((entry) => omitObjectKeys(entry as AnyObject, keysToRemove));
            },
        ) as PartialDatabaseDump,
        (modelName, rows) => !!rows.length,
    );
}

export const defaultOmitFields = [
    'postedAt',
    'password',
    /** EmailCode.code is a non-deterministic hash, similar to password. */
    'code',
    'emailedAt',
];

export type DatabaseDiffOptions = PartialWithUndefined<{
    omitFieldsOverride: string[];
}>;

/** Diff the database before and after the given callback is executed. */
export async function getDatabaseDiff<T>(
    backendClientInterface: Readonly<BackendClientInterface>,
    dbInit: DatabaseInit | undefined,
    callback: () => MaybePromise<T>,
    options: Readonly<DatabaseDiffOptions> = {},
): Promise<{
    dbDiff?: DatabaseDiff;
    output?: T;
}> {
    if (dbInit) {
        await prismaApi.client.addData<PrismaClient, Prisma.TypeMap>({
            prismaClient: backendClientInterface.prismaClient,
            data: dbInit,
        });
    }

    const databaseDumpBefore = dumpToObjects(
        await prismaApi.client.dumpData<Prisma.TypeMap>({
            prismaClient: backendClientInterface.prismaClient,
            omitFields: options.omitFieldsOverride || defaultOmitFields,
        }),
    );

    const output: T = await callback();

    const databaseDumpAfter = dumpToObjects(
        await prismaApi.client.dumpData<Prisma.TypeMap>({
            prismaClient: backendClientInterface.prismaClient,
            omitFields: options.omitFieldsOverride || defaultOmitFields,
        }),
    );

    const rawDiff = diffObjects(databaseDumpBefore, databaseDumpAfter);

    const removed = dumpObjectsBackToArrays((rawDiff[0] || {}) as ObjectDatabaseDump);
    const added = dumpObjectsBackToArrays((rawDiff[1] || {}) as ObjectDatabaseDump);

    const dbDiff: DatabaseDiff = {
        ...(Object.keys(removed).length
            ? {
                  removed,
              }
            : {}),
        ...(Object.keys(added).length
            ? {
                  added,
              }
            : {}),
    };

    const outputObject =
        output == undefined
            ? {}
            : {
                  output,
              };
    const diffObject = Object.keys(dbDiff).length
        ? {
              dbDiff,
          }
        : {};

    return {
        ...outputObject,
        ...diffObject,
    };
}
