import {assert, check} from '@augment-vir/assert';
import {type PrismaAllModelsCreate} from '@augment-vir/common';
import {type ModelName, type Prisma, type PrismaClient} from '@evir/common';
import {type PrismaAddModelData} from 'prisma-vir';
import {type IsEqual, type Writable} from 'type-fest';

export type DatabaseInit<Model extends ModelName | void = void> =
    IsEqual<Model, void> extends true
        ? PrismaAddModelData<PrismaClient, Prisma.TypeMap>
        : Model extends keyof PrismaAllModelsCreate<PrismaClient, Prisma.TypeMap>
          ? NonNullable<PrismaAllModelsCreate<PrismaClient, Prisma.TypeMap>[Model]>
          : never;

export function mergeDatabaseInits(
    ...inits: ReadonlyArray<Readonly<DatabaseInit> | undefined>
): DatabaseInit {
    const databaseInitArray: Writable<Extract<DatabaseInit, ReadonlyArray<any>>> = [];

    inits.forEach((init) => {
        if (check.isArray(init)) {
            databaseInitArray.push(...init);
        } else if (check.isObject(init)) {
            databaseInitArray.push(init);
        } else {
            assert.tsType(init).equals<undefined>();
            assert.isUndefined(init);
        }
    });

    return databaseInitArray;
}
