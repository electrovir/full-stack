import {DeployEnv} from '@evir/common';
import {initSentry} from 'sentry-vir/dist/node.js';
import {BackendServiceKey} from '../../data/backend-service-key.js';
import {type BackendEnvClient} from './backend-env.client.js';

/** By default, each service key is enabled already. */
const enabledSentryServices: Partial<Record<BackendServiceKey, boolean>> = {
    [BackendServiceKey.Script]: false,
};

export async function createBackendSentryClient(backendEnvClient: Readonly<BackendEnvClient>) {
    if (enabledSentryServices[backendEnvClient.serviceKey] === false) {
        return undefined;
    }

    const sentry = await initSentry({
        dsn: 'YOU SHOULD UPDATE THIS',
        isDev: backendEnvClient.deployEnv === DeployEnv.Dev,
        releaseEnv: backendEnvClient.deployEnv,
        releaseName: backendEnvClient.releaseName,
        createUniversalContext() {
            return {
                service: backendEnvClient.serviceKey,
            };
        },
        sentryConfigOverrides: {
            sendDefaultPii: false,
        },
    });

    sentry.setTag('service', backendEnvClient.serviceKey);

    return sentry;
}
