import {check} from '@augment-vir/assert';
import {type AnyFunction} from '@augment-vir/common';
import {AdminAlertClient} from './clients/admin-alert.client.js';
import {createBackendAuthClient} from './clients/backend-auth.client.js';
import {createBackendEnvClient, type BackendEnvClientParams} from './clients/backend-env.client.js';
import {createBackendSecretsClient} from './clients/backend-secrets.client.js';
import {createBackendSentryClient} from './clients/backend-sentry.client.js';
import {EmailClient} from './clients/email.client.js';
import {EventLogClient} from './clients/event-log-client/event-log.client.js';
import {createPrismaClient} from './clients/prisma/prisma.client.js';

export async function createBackendClientInterface(params: Readonly<BackendEnvClientParams>) {
    const backendEnvClient = await createBackendEnvClient(params);
    const prismaClient = await createPrismaClient({
        deployEnv: backendEnvClient.deployEnv,
        test: params.test,
    });
    const backendSecretsClient = await createBackendSecretsClient(backendEnvClient);
    const backendAuthClient = createBackendAuthClient({
        backendEnvClient,
        prismaClient,
        backendSecretsClient,
    });
    const eventLogClient = new EventLogClient({
        backendEnvClient,
        prismaClient,
    });
    const emailClient = new EmailClient({
        prismaClient,
        backendSecretsClient,
        backendEnvClient,
        eventLogClient,
    });

    const sentryClient = await createBackendSentryClient(backendEnvClient);
    const adminAlertClient = new AdminAlertClient({
        backendEnvClient,
    });

    const clientInterface = {
        adminAlertClient,
        prismaClient,
        backendEnvClient,
        backendSecretsClient,
        backendAuthClient,
        eventLogClient,
        sentryClient,
        emailClient,
        async destroy() {
            await prismaClient.$disconnect();
            await sentryClient?.close();

            await Promise.all(
                Object.values(clientInterface).map(async (client) => {
                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    if (check.hasKey(client, 'destroy') && check.isFunction(client.destroy)) {
                        await (client as {destroy: AnyFunction}).destroy();
                    }
                }),
            );
        },
    };

    return clientInterface;
}

export type BackendClientInterface = Awaited<ReturnType<typeof createBackendClientInterface>>;
