/**
 * Packages the compiled backend into a deployable zip file.
 *
 * Steps:
 *
 * 1. Copies the full repo into a temp "buildInstall" directory.
 * 2. Installs dependencies and builds the backend there (`npm ci` + `npm run build:backend`).
 * 3. Copies only production-necessary files into a second temp "buildFinal" directory.
 * 4. Installs production-only dependencies in the buildFinal directory.
 * 5. Zips the buildFinal directory.
 * 6. Optionally uploads the zip to an SSH server.
 *
 * The source repo is never mutated.
 *
 * Usage:
 *
 *     npx tsx packages/scripts/src/deploy-backend.script.ts
 *     npx tsx packages/scripts/src/deploy-backend.script.ts myHost
 *
 * @module
 */

import {assert, check} from '@augment-vir/assert';
import {awaitedBlockingMap, awaitedForEach, indent, log} from '@augment-vir/common';
import {readPackageJson, runShellCommand} from '@augment-vir/node';
import {monoRepoDirPath, packageNameToDirPath} from '@evir/common-backend';
import {select} from '@inquirer/prompts';
import {FlagRequirement, parseArgs} from 'cli-vir';
import {createPackageTree} from 'mono-vir';
import {existsSync} from 'node:fs';
import {cp, mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';
import {listSshHostNames} from './list-ssh-host-names.js';

/**
 * By default, all needed packages' `dist` dir and `package.json` file are included. Anything listed
 * here is also added.
 */
const extraPackageContents: Partial<Record<string, string[]>> = {
    '@evir/database': [
        'prisma',
    ],
};

const backendPackage = '@evir/backend';
const noneSshHost = '<None>';

async function patchRootPackageJson(
    buildFinalDirPath: string,
    workspaceRelativePaths: ReadonlyArray<string>,
) {
    const rootPackageJsonPath = join(buildFinalDirPath, 'package.json');
    const rootPackageJson = await readPackageJson(buildFinalDirPath);

    rootPackageJson.workspaces = [...workspaceRelativePaths];

    delete rootPackageJson.devDependencies;
    delete rootPackageJson.overrides;

    await writeFile(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 4) + '\n');
}

async function patchWorkspacePackageJson(packageDirPath: string) {
    const packageJsonFilePath = join(packageDirPath, 'package.json');
    const packageJsonContents = await readPackageJson(packageDirPath);

    delete packageJsonContents.devDependencies;

    await writeFile(packageJsonFilePath, JSON.stringify(packageJsonContents, null, 4) + '\n');
}

async function createZip(buildFinalDirPath: string): Promise<string> {
    const outputDir = join(monoRepoDirPath, '.not-committed');

    await mkdir(outputDir, {
        recursive: true,
    });

    const zipName = `backend-${Date.now()}.zip`;
    const zipPath = join(outputDir, zipName);

    await runShellCommand(`zip -r -q "${zipPath}" .`, {
        cwd: buildFinalDirPath,
        hookUpToConsole: true,
        rejectOnError: true,
    });

    return zipPath;
}

async function runDeploy(rawArgs: ReadonlyArray<string>) {
    const args = parseArgs(
        rawArgs,
        {
            sshHostName: {
                position: 0,
                description:
                    'The name of the SSH host to upload the build to. If none is provided, the user will be prompted for it.',
            },
            skipSsh: {
                flag: {
                    valueRequirement: FlagRequirement.Blocked,
                },
                description:
                    'If set, the user will not be prompted for an SSH host to connect to, even if sshHostName is not provided.',
            },
            keep: {
                flag: {
                    valueRequirement: FlagRequirement.Blocked,
                },
                description:
                    'If set, the output folders will not be cleaned up (useful for debugging).',
            },
        },
        {
            binName: undefined,
            importMeta: import.meta,
        },
    );

    const sshHostName =
        args.sshHostName ||
        (!args.skipSsh &&
            (await select({
                message: 'Select an SSH host to upload to:',
                loop: false,
                pageSize: 20,
                choices: [
                    ...(await listSshHostNames()).map((hostName) => {
                        return {
                            value: hostName,
                            name: hostName,
                        };
                    }),
                    {
                        value: noneSshHost,
                        name: noneSshHost,
                    },
                ],
            }))) ||
        undefined;

    const shouldUpload: boolean = !!sshHostName && sshHostName !== noneSshHost;

    const packagesToInclude = [
        backendPackage,
        ...((await createPackageTree(monoRepoDirPath)).allDependenciesByPackage[backendPackage]
            ?.dependencies || []),
    ];

    assert.isLengthAtLeast(
        packagesToInclude,
        2,
        'No dependencies to include, are you sure this script is working?',
    );
    log.faint(`Backend packages:\n${indent(packagesToInclude.join('\n'))}`);

    const buildInstallDirPath = await mkdtemp(join(tmpdir(), 'backend-build-install-'));
    const buildFinalDirPath = await mkdtemp(join(tmpdir(), 'backend-build-final-'));

    log.faint(`\nbuildInstallDirPath: ${buildInstallDirPath}`);
    log.faint(`buildFinalDirPath: ${buildFinalDirPath}\n`);

    try {
        await runShellCommand(
            `rsync -a --exclude='.git' --exclude='node_modules' --exclude='.not-committed' "${monoRepoDirPath}/" "${buildInstallDirPath}/"`,
            {
                hookUpToConsole: true,
                rejectOnError: true,
            },
        );

        await runShellCommand('npm ci', {
            cwd: buildInstallDirPath,
            hookUpToConsole: true,
            rejectOnError: true,
        });

        await runShellCommand('npm run build:backend', {
            cwd: buildInstallDirPath,
            hookUpToConsole: true,
            rejectOnError: true,
        });

        await cp(
            join(buildInstallDirPath, 'package.json'),
            join(buildFinalDirPath, 'package.json'),
        );
        const npmrcFrom = join(buildInstallDirPath, '.npmrc');
        if (existsSync(npmrcFrom)) {
            await cp(npmrcFrom, join(buildFinalDirPath, '.npmrc'));
        }

        const workspaceRelativePaths = await awaitedBlockingMap(
            packagesToInclude,
            async (packageName) => {
                const packageDirPath = check.isKeyOf(packageName, packageNameToDirPath)
                    ? packageNameToDirPath[packageName]
                    : undefined;

                if (!packageDirPath) {
                    throw new Error(
                        `Failed to find repo package path for package by name '${packageName}'.`,
                    );
                }

                const workspaceRelativePath = relative(monoRepoDirPath, packageDirPath);
                const buildInstallPackageDirPath = join(buildInstallDirPath, workspaceRelativePath);
                const buildFinalPackageDirPath = join(buildFinalDirPath, workspaceRelativePath);

                await mkdir(buildFinalPackageDirPath, {
                    recursive: true,
                });

                const contents = [
                    'dist',
                    'package.json',
                    ...(extraPackageContents[packageName] ?? []),
                ];

                await awaitedForEach(contents, async (entry) => {
                    const from = join(buildInstallPackageDirPath, entry);
                    const to = join(buildFinalPackageDirPath, entry);

                    if (!existsSync(from)) {
                        throw new Error(`Expected file/dir does not exist: ${from}`);
                    }

                    await cp(from, to, {
                        recursive: true,
                    });
                });

                await patchWorkspacePackageJson(buildFinalPackageDirPath);

                return workspaceRelativePath;
            },
        );

        await patchRootPackageJson(buildFinalDirPath, workspaceRelativePaths);

        await runShellCommand('npm install --omit=dev', {
            cwd: buildFinalDirPath,
            hookUpToConsole: true,
            rejectOnError: true,
        });

        await runShellCommand('npm run init', {
            cwd: buildFinalDirPath,
            hookUpToConsole: true,
            rejectOnError: true,
        });

        const zipPath = await createZip(buildFinalDirPath);

        log.faint(`\nBackend packaged: ${zipPath}`);

        if (shouldUpload) {
            await runShellCommand(`scp "${zipPath}" "${sshHostName}"`, {
                hookUpToConsole: true,
                rejectOnError: true,
            });

            log.success(`Package uploaded to: ${sshHostName}`);
        } else {
            log.success(`Package built at: ${buildFinalDirPath}`);
        }
    } finally {
        if (shouldUpload && !args.keep) {
            await Promise.all([
                rm(buildInstallDirPath, {
                    recursive: true,
                    force: true,
                }),
                rm(buildFinalDirPath, {
                    recursive: true,
                    force: true,
                }),
            ]);
        }
    }
}

try {
    await runDeploy(process.argv);
    process.exit(0);
} catch (error) {
    log.error(error);
    process.exit(1);
}
