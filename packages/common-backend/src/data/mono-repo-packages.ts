import {check} from '@augment-vir/assert';
import {filterMap} from '@augment-vir/common';
import {joinFilesToDir} from '@augment-vir/node';
import {readdir} from 'node:fs/promises';
import {packagesDirPath} from './file-paths.js';

/** Returns all paths for all the mono-repo's package directories. */
export async function listMonoRepoPackagePaths(): Promise<string[]> {
    return joinFilesToDir(
        packagesDirPath,
        filterMap(
            await readdir(packagesDirPath, {
                withFileTypes: true,
            }),
            (file) => {
                if (file.isDirectory()) {
                    return file.name;
                } else {
                    return undefined;
                }
            },
            check.isTruthy,
        ),
    ).sort();
}
