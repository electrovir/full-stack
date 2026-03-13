import {assert, check, checkWrap} from '@augment-vir/assert';
import {log} from '@augment-vir/common';
import {runShellCommand} from '@augment-vir/node';
import {DeployEnv} from '@evir/common';
import {parseArgs} from 'cli-vir';
import {createSqliteDatabaseUrl} from 'prisma-vir';
import {prismaSchemaFilePath} from '../../../data/file-paths.js';

const {args} = parseArgs(
    process.argv,
    {
        args: {
            position: {
                rest: true,
            },
        },
    },
    {
        binName: undefined,
        importMeta: import.meta,
    },
);
const fullCommand = args.join(' ');
const defaultToDev = fullCommand.includes('migrate dev');

const deployEnv: DeployEnv | undefined = defaultToDev
    ? DeployEnv.Dev
    : checkWrap.isEnumValue(args[0], DeployEnv);

assert.isDefined(deployEnv, 'Missing deploy env');

const prismaArgs = check.isEnumValue(args[0], DeployEnv) ? args.slice(1) : args;

const prismaCommand = [
    'prisma',
    ...prismaArgs,
    '--schema',
    prismaSchemaFilePath,
].join(' ');

log.info(`Prisma DeployEnv: ${deployEnv}`);

const databaseUrl = createSqliteDatabaseUrl();

await runShellCommand(prismaCommand, {
    hookUpToConsole: true,
    rejectOnError: true,
    env: {
        ...process.env,
        DATABASE_URL: databaseUrl.url,
    },
});
