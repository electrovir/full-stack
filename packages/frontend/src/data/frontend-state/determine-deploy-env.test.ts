import {describe, itCases} from '@augment-vir/test';
import {DeployEnv} from '@evir/common';
import {determineFrontendDeployEnv} from './determine-deploy-env.js';

describe(determineFrontendDeployEnv.name, () => {
    itCases(determineFrontendDeployEnv, [
        {
            it: 'works in dev',
            input: 'localhost',
            expect: DeployEnv.Dev,
        },
        {
            it: 'works in staging',
            input: 'staging.example.com',
            expect: DeployEnv.Staging,
        },
        {
            it: 'works in prod',
            input: 'example.com',
            expect: DeployEnv.Prod,
        },
    ]);
});
