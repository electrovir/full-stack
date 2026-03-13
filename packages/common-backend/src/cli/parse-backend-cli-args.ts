import {log, type PartialWithUndefined, type SelectFrom} from '@augment-vir/common';
import {DeployEnv} from '@evir/common';
import {FlagRequirement, parseArgs} from 'cli-vir';
import {
    defineShape,
    enumShape,
    optionalShape,
    parseJsonWithShape,
    unionShape,
} from 'object-shape-tester';

export const backendCliArgsConfigShape = defineShape({
    deployEnv: enumShape(DeployEnv),
    releaseName: optionalShape('', {
        alsoUndefined: true,
    }),
    testName: optionalShape('', {
        alsoUndefined: true,
    }),
});

export type BackendCliArgs = Required<typeof backendCliArgsConfigShape.runtimeType> &
    PartialWithUndefined<{
        port: number;
    }>;

export function parseBackendCliArgs(
    rawArgs: ReadonlyArray<string>,
    importMeta: SelectFrom<
        ImportMeta,
        {
            filename: true;
        }
    >,
): BackendCliArgs {
    const args = parseArgs(
        rawArgs,
        {
            config: {
                description: 'JSON config',
                position: 0,
            },
            port: {
                flag: {
                    valueRequirement: FlagRequirement.Required,
                },
                description: 'Used in dev to know what port to start the backend on.',
                type: 'number',
            },
        },
        {
            binName: undefined,
            importMeta,
        },
    );
    const config = parseJsonWithShape(
        args.config || '',
        unionShape(undefined, backendCliArgsConfigShape),
        undefined,
        'Invalid config input.',
    );

    const backendCliArgs: BackendCliArgs = {
        deployEnv: config?.deployEnv || DeployEnv.Dev,
        releaseName: config?.releaseName,
        testName: config?.testName || undefined,
        port: args.port || undefined,
    };

    log.info(JSON.stringify(backendCliArgs, null, 4));

    return backendCliArgs;
}
