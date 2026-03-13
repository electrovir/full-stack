import {type SelectFrom} from '@augment-vir/common';
import {createFrontendUrl, DeployEnv, type RawUniversalConfig} from '@evir/common';

export function determineFrontendDeployEnv(
    hostname: string,
    rawUniversalConfig: Readonly<
        SelectFrom<
            RawUniversalConfig,
            {
                topDomain: true;
                frontendProductionSubdomain: true;
            }
        >
    >,
): DeployEnv {
    const prodHost = createFrontendUrl(DeployEnv.Prod, rawUniversalConfig).host;

    if (hostname === prodHost) {
        return DeployEnv.Prod;
    } else if (
        hostname === createFrontendUrl(DeployEnv.Staging, rawUniversalConfig).host ||
        hostname.endsWith(prodHost)
    ) {
        return DeployEnv.Staging;
    } else {
        return DeployEnv.Dev;
    }
}
