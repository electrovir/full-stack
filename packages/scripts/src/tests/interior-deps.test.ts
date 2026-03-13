import {assert, assertWrap} from '@augment-vir/assert';
import {
    arrayToObject,
    extractDuplicates,
    getObjectTypedValues,
    removeDuplicates,
    stringify,
} from '@augment-vir/common';
import {readFileIfExists, readPackageJson} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import {listMonoRepoPackagePaths} from '@evir/common-backend';
import {basename, join, resolve} from 'node:path';
import {type TsConfigJson} from 'type-fest';

async function getAllPackages() {
    const packages = await arrayToObject(await listMonoRepoPackagePaths(), async (path) => {
        const key = basename(path);
        const packageJson = await readPackageJson(path);
        const packageName = assertWrap.isTruthy(
            packageJson.name,
            `No package name found for '${path}'`,
        );
        const tsconfig: TsConfigJson = JSON.parse(
            assertWrap.isTruthy(
                await readFileIfExists(join(path, 'tsconfig.json')),
                `Missing tsconfig for '${path}'`,
            ),
        );

        const tsReferences = (tsconfig.references || []).map((reference) => {
            return {
                path: resolve(path, reference.path),
                key: basename(reference.path),
                name: '',
            };
        });

        return {
            key,
            value: {
                path,
                tsReferences,
                key,
                packageDeps: removeDuplicates([
                    ...Object.keys(packageJson.dependencies || {}),
                    ...Object.keys(packageJson.devDependencies || {}),
                ]),
                packageName,
            },
        };
    });

    const allRepoPackageNames = getObjectTypedValues(packages).map(
        (repoPackage) => repoPackage.packageName,
    );

    getObjectTypedValues(packages).forEach((packageData) => {
        packageData.packageDeps = packageData.packageDeps.filter((packageName) =>
            allRepoPackageNames.includes(packageName),
        );
        packageData.tsReferences.forEach((tsReference) => {
            tsReference.name = assertWrap.isDefined(
                packages[tsReference.key],
                `Failed to get ts ref from '${packageData.packageName}' to '${stringify(tsReference)}'`,
            ).packageName;
        });
    });

    return packages;
}

describe('interior dependencies', () => {
    it('all include package.json and tsconfig references', async () => {
        const packages = getObjectTypedValues(await getAllPackages());

        assert.isLengthAtLeast(packages, 2);

        const failures: string[] = [];

        packages.forEach((repoPackage) => {
            const tsReferences = repoPackage.tsReferences.map((tsReference) => tsReference.name);

            const {uniques} = extractDuplicates([
                ...tsReferences,
                ...repoPackage.packageDeps,
            ]);
            if (uniques.length) {
                failures.push(
                    `Deps for '${repoPackage.packageName}' were not duplicated in tsconfig and package.json:\n${stringify(
                        {
                            tsReferences: tsReferences.toSorted(),
                            packageDeps: repoPackage.packageDeps.toSorted(),
                        },
                        4,
                    )}`,
                );
            }
        });

        assert.isEmpty(failures, `\n${failures.join('\n\n')}`);
    });
});
