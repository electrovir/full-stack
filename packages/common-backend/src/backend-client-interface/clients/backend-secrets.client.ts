import {DeployEnv} from '@evir/common';
import {generateNewJwtKeys, type RawJwtKeys} from 'auth-vir';
import {
    createUpdatingSecrets,
    defineSecrets,
    SecretsJsonFileAdapter,
    type SecretValues,
} from 'updating-secrets';
import {devSecretsFilePath, productionSecretsFilePath} from '../../data/file-paths.js';
import {type BackendEnvClient} from './backend-env.client.js';

const secretsDefinitions = defineSecrets({
    jwtKeys: {
        description: 'The keys required for JWT encryption and signing to function.',
        whereToFind: `
            These are randomly generated on first launch.
        `,
        shape: {
            encryptionKey: '',
            signingKey: '',
        } satisfies RawJwtKeys,
    },
    mailgun: {
        description: 'Access to the Mailgun api.',
        whereToFind: `
            Go to https://app.mailgun.com > Account Settings > API Security.
            
            Or navigate directly to https://app.mailgun.com/settings/api_security.
        `,
        shape: {
            keyId: '',
            keySecret: '',
        },
    },
});

export type BackendSecrets = SecretValues<typeof secretsDefinitions>;

export async function createBackendSecretsClient(backendEnvClient: Readonly<BackendEnvClient>) {
    const adapters = [
        new SecretsJsonFileAdapter(
            backendEnvClient.deployEnv === DeployEnv.Dev
                ? devSecretsFilePath
                : productionSecretsFilePath,
            {
                async generateValues(): Promise<BackendSecrets> {
                    return {
                        jwtKeys: await generateNewJwtKeys(),
                        /** Mailgun secrets are not used in dev. */
                        mailgun: {
                            keyId: '',
                            keySecret: '',
                        },
                    };
                },
            },
        ),
    ];

    const updatingSecrets = await createUpdatingSecrets(secretsDefinitions, adapters, {
        lazyFailure: backendEnvClient.deployEnv === DeployEnv.Dev,
        silent: true,
    });

    if (backendEnvClient.testName) {
        /**
         * Immediately load all secrets and then destroy this client in tests so they don't cause
         * the tests to hang.
         */
        await updatingSecrets.loadSecrets();
        updatingSecrets.destroy();
    }

    return updatingSecrets;
}

export type BackendSecretsClient = Awaited<ReturnType<typeof createBackendSecretsClient>>;
