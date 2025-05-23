import {monoRepoDirPath, notCommittedDirPath} from '@evir/database';
import {join} from 'node:path';

export * from '@evir/database/src/database-paths.js';

export const secretsFilePath = join(notCommittedDirPath, 'secrets.json');
export const packageDirPaths = {
    commonBacked: join(monoRepoDirPath, 'packages', 'common-backend'),
    database: join(monoRepoDirPath, 'packages', 'database'),
};
