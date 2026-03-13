import {describe, itCases} from '@augment-vir/test';
import {defaultRawUniversalConfig, DeployEnv} from '@evir/common';
import {determineFrontendDeployEnv} from './determine-deploy-env.js';

describe(determineFrontendDeployEnv.name, () => {
    itCases(determineFrontendDeployEnv, [
        {
            it: 'works in dev',
            inputs: [
                'localhost',
                defaultRawUniversalConfig,
            ],
            expect: DeployEnv.Dev,
        },
        {
            it: 'works in staging',
            inputs: [
                'staging.app.example.com',
                defaultRawUniversalConfig,
            ],
            expect: DeployEnv.Staging,
        },
        {
            it: 'works in prod',
            inputs: [
                'app.example.com',
                defaultRawUniversalConfig,
            ],
            expect: DeployEnv.Prod,
        },
        {
            it: 'treats unknown sub domains as staging',
            inputs: [
                'some-branch.app.example.com',
                defaultRawUniversalConfig,
            ],
            expect: DeployEnv.Staging,
        },
        {
            it: 'respects a different config host',
            inputs: [
                'app.example.io',
                {
                    topDomain: 'example.io',
                    frontendProductionSubdomain: 'app',
                },
            ],
            expect: DeployEnv.Prod,
        },
    ]);
});
