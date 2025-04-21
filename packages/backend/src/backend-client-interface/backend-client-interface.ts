import {type UniversalTestContext} from '@augment-vir/test';
import {DeployEnv} from '@evir/common';
import {defaultBackendConfig, type BackendConfig} from '@evir/common-backend';
import {parseJwtKeys} from 'auth-vir';
import {EmailClient} from './email-client.js';
import {createPrismaClient} from './prisma-client/prisma-client.js';
import {createSecretsClient} from './secrets-client/secrets-client.js';

export type BackendClientInterfaceParams = {
    /** The environment that the current backend has been released to. */
    deployEnv: DeployEnv;
    /** The name of the current release. This is typically a git commit hash. */
    releaseName: string;
    testContext?: UniversalTestContext | undefined;
    backendConfig?: BackendConfig | undefined;
};

export async function createBackendClientInterface({
    deployEnv,
    releaseName,
    testContext,
    backendConfig = defaultBackendConfig,
}: Readonly<BackendClientInterfaceParams>) {
    const secretsClient = await createSecretsClient(deployEnv, backendConfig);
    const prismaClient = await createPrismaClient(
        deployEnv === DeployEnv.Dev ? {dev: testContext} : {nonDev: secretsClient},
    );

    return {
        secretsClient,
        prismaClient,
        envClient: {
            deployEnv,
            releaseName,
            backendConfig,
        },
        jwtClient: {
            jwtParams: {
                jwtKeys: await parseJwtKeys(secretsClient.get.jwtKeys),
                audience: 'server-context',
                issuer: 'server-auth',
                jwtDuration: backendConfig.authCookieDuration,
            },
        },
        emailClient: new EmailClient(deployEnv, prismaClient, backendConfig),
    };
}

export type BackendClientInterface = Awaited<ReturnType<typeof createBackendClientInterface>>;
