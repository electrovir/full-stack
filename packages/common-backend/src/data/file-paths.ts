import {systemRootPath} from '@augment-vir/node';
import {existsSync} from 'node:fs';
import {join, resolve} from 'node:path';

export const monoRepoDirPath = resolve(import.meta.dirname, '..', '..', '..', '..');
export const notCommittedDirPath = join(monoRepoDirPath, '.not-committed');
export const devDatabasePath = resolve(notCommittedDirPath, 'dev.db');
export const packagesDirPath = join(monoRepoDirPath, 'packages');
export const playwrightOutputsDirPath = join(notCommittedDirPath, 'playwright', 'outputs');
export const testsDirPath = join(notCommittedDirPath, 'tests');

export const packageDirPaths = {
    backend: join(packagesDirPath, 'backend'),
    common: join(packagesDirPath, 'common'),
    commonBackend: join(packagesDirPath, 'common-backend'),
    database: join(packagesDirPath, 'database'),
    e2e: join(packagesDirPath, 'e2e'),
    frontend: join(packagesDirPath, 'frontend'),
    scripts: join(packagesDirPath, 'scripts'),
};

export const packageNameToDirPath = {
    '@evir/backend': packageDirPaths.backend,
    '@evir/common': packageDirPaths.common,
    '@evir/common-backend': packageDirPaths.commonBackend,
    '@evir/database': packageDirPaths.database,
    '@evir/e2e': packageDirPaths.e2e,
    '@evir/frontend': packageDirPaths.frontend,
    '@evir/scripts': packageDirPaths.scripts,
};

export const frontendSrcDirPath = join(packageDirPaths.frontend, 'src');
export const e2eScreenshotsDirPath = join(packageDirPaths.e2e, 'screenshots');

export const databasePrismaDirPath = join(packageDirPaths.database, 'prisma');
export const prismaSchemaFilePath = join(databasePrismaDirPath, 'schema.prisma');
export const prismaMigrationsDirPath = join(databasePrismaDirPath, 'migrations');

export const productionStorageDirPath = join(
    systemRootPath,
    'var',
    'lib',
    'apps',
    /** YOU SHOULD UPDATE THIS */
    'my-app',
);
export const productionDatabaseFilePath = join(productionStorageDirPath, 'prod.db');
export const productionSecretsFilePath = join(productionStorageDirPath, 'secrets.json');
export const devSecretsFilePath = join(notCommittedDirPath, 'secrets.json');
export const devEmailsDirPath = join(notCommittedDirPath, 'email');

export const githubDirPath = join(monoRepoDirPath, '.github');

/** All of these file paths should _always_ exist. */
const pathsThatShouldAlwaysExist = [
    monoRepoDirPath,
    packagesDirPath,
    databasePrismaDirPath,
    prismaSchemaFilePath,
];

pathsThatShouldAlwaysExist.forEach((path) => {
    if (!existsSync(path)) {
        throw new Error(`Path should exist: ${path}`);
    }
});
