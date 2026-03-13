import {describe, itCases} from '@augment-vir/test';
import {DeployEnv, e2eTestName} from '@evir/common';
import {type backendCliArgsConfigShape, parseBackendCliArgs} from './parse-backend-cli-args.js';

describe(parseBackendCliArgs.name, () => {
    itCases(parseBackendCliArgs, [
        {
            it: 'parses staging',
            inputs: [
                [
                    'xvfb-run',
                    'node',
                    'dist/start-backend.script.js',
                    JSON.stringify({
                        deployEnv: DeployEnv.Staging,
                        releaseName: '17e917009a6393c2a2b1d785ef43695af89fe1fe',
                    } satisfies typeof backendCliArgsConfigShape.runtimeType),
                ],
                {
                    filename: 'dist/start-backend.script.js',
                },
            ],
            expect: {
                deployEnv: DeployEnv.Staging,
                testName: undefined,
                releaseName: '17e917009a6393c2a2b1d785ef43695af89fe1fe',
                port: undefined,
            },
        },
        {
            it: 'parses with a test',
            inputs: [
                [
                    'xvfb-run',
                    'node',
                    'dist/start-backend.script.js',
                    JSON.stringify({
                        deployEnv: DeployEnv.Staging,
                        releaseName: '17e917009a6393c2a2b1d785ef43695af89fe1fe',
                        testName: e2eTestName,
                    } satisfies typeof backendCliArgsConfigShape.runtimeType),
                ],
                {
                    filename: 'dist/start-backend.script.js',
                },
            ],
            expect: {
                deployEnv: DeployEnv.Staging,
                testName: e2eTestName,
                releaseName: '17e917009a6393c2a2b1d785ef43695af89fe1fe',
                port: undefined,
            },
        },
    ]);
});
