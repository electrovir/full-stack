import {join, resolve} from 'node:path';

export const monoRepoDirPath = resolve(import.meta.dirname, '..', '..', '..');
export const notCommittedDirPath = join(monoRepoDirPath, '.not-committed');
export const secretsFilePath = join(notCommittedDirPath, 'secrets.json');
export const packageDirPaths = {
    commonBacked: join(monoRepoDirPath, 'packages', 'common-backend'),
    database: join(monoRepoDirPath, 'packages', 'database'),
};
export const prismaSchemaFilePath = join(packageDirPaths.database, 'prisma', 'schema.prisma');
