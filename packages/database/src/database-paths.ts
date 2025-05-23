import {join, resolve} from 'node:path';

export const monoRepoDirPath = resolve(import.meta.dirname, '..', '..', '..');
export const notCommittedDirPath = join(monoRepoDirPath, '.not-committed');
