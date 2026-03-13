import {awaitedForEach, removeDuplicates} from '@augment-vir/common';
import {existsSync} from 'node:fs';
import {readdir, readFile} from 'node:fs/promises';
import {homedir} from 'node:os';
import {basename, dirname, join} from 'node:path';

export async function listSshHostNames(): Promise<ReadonlyArray<string>> {
    const sshDirPath = join(homedir(), '.ssh');
    const hosts = removeDuplicates(
        await parseSshConfigHosts(join(sshDirPath, 'config'), sshDirPath),
    );

    if (!hosts.length) {
        throw new Error(`No SSH host names found in '${join(sshDirPath, 'config')}'.`);
    }

    return hosts;
}

async function parseSshConfigHosts(
    configPath: string,
    sshDirPath: string,
): Promise<ReadonlyArray<string>> {
    if (!existsSync(configPath)) {
        return [];
    }

    const content = await readFile(configPath, 'utf8');
    const hosts: string[] = [];

    await awaitedForEach(content.split('\n'), async (line) => {
        const trimmed = line.trim();

        if (/^Host\s+/i.test(trimmed)) {
            hosts.push(
                ...trimmed
                    .replace(/^Host\s+/i, '')
                    .split(/\s+/)
                    .filter((entry) => !entry.includes('*') && !entry.includes('?')),
            );
            return;
        }

        if (/^Include\s+/i.test(trimmed)) {
            const includedPaths = await resolveSshIncludePaths(
                trimmed.replace(/^Include\s+/i, '').trim(),
                sshDirPath,
            );

            await awaitedForEach(includedPaths, async (includedPath) => {
                hosts.push(...(await parseSshConfigHosts(includedPath, sshDirPath)));
            });
        }
    });

    return hosts;
}

/** Resolves an SSH config `Include` path (with tilde and glob expansion) to concrete file paths. */
async function resolveSshIncludePaths(
    rawPath: string,
    sshDirPath: string,
): Promise<ReadonlyArray<string>> {
    const expandedPath = rawPath.startsWith('~/')
        ? join(homedir(), rawPath.slice(2))
        : rawPath.startsWith('/')
          ? rawPath
          : join(sshDirPath, rawPath);

    if (!expandedPath.includes('*') && !expandedPath.includes('?')) {
        return existsSync(expandedPath) ? [expandedPath] : [];
    }

    const dirPath = dirname(expandedPath);
    const filePattern = basename(expandedPath);

    if (!existsSync(dirPath)) {
        return [];
    }

    const globRegex = new RegExp(
        '^' +
            filePattern
                .replace(/[.+^${}()|[\]\\]/g, String.raw`\$&`)
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.') +
            '$',
    );

    const entries = await readdir(dirPath);

    return entries.filter((entry) => globRegex.test(entry)).map((entry) => join(dirPath, entry));
}
