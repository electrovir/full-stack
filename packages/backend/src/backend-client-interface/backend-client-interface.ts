import {type UniversalTestContext} from '@augment-vir/test';
import {type DeployEnv} from '@evir/common';
import {defaultBackendConfig, type BackendConfig} from '@evir/common-backend';
import {AuthClient} from './auth-client.js';
import {EmailClient} from './email-client.js';
import {createPrismaClient} from './prisma-client.js';
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
        testContext
            ? {
                  test: testContext,
              }
            : {
                  secretsClient,
                  env: deployEnv,
              },
    );

    return {
        secretsClient,
        prismaClient,
        envClient: {
            deployEnv,
            releaseName,
            backendConfig,
        },
        authClient: new AuthClient(secretsClient, backendConfig, deployEnv),
        emailClient: new EmailClient(deployEnv, prismaClient, secretsClient, backendConfig),
    };
}

export type BackendClientInterface = Awaited<ReturnType<typeof createBackendClientInterface>>;
