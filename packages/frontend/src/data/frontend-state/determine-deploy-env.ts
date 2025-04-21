import {DeployEnv} from '@evir/common';

export function determineFrontendDeployEnv(hostname: string): DeployEnv {
    if (hostname === 'localhost') {
        return DeployEnv.Dev;
    } else if (hostname.startsWith('staging.')) {
        return DeployEnv.Staging;
    } else {
        return DeployEnv.Prod;
    }
}
