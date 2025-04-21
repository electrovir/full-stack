import {type SelectFrom} from '@augment-vir/common';
import {SecretsManager} from '@aws-sdk/client-secrets-manager';
import {DeployEnv} from '@evir/common';
import {secretsFilePath, type BackendConfig} from '@evir/common-backend';
import {
    AwsSecretsManagerAdapter,
    createUpdatingSecrets,
    SecretsJsonFileAdapter,
} from 'updating-secrets';
import {defineBackendSecrets, generateDevSecrets} from './secret-definitions.js';

export async function createSecretsClient(
    deployEnv: DeployEnv,
    backendConfig: Readonly<SelectFrom<BackendConfig, {aws: {region: true}}>>,
) {
    const adapters =
        deployEnv === DeployEnv.Dev
            ? [
                  new SecretsJsonFileAdapter(secretsFilePath, {
                      generateValues: generateDevSecrets,
                  }),
              ]
            : [
                  new AwsSecretsManagerAdapter(
                      new SecretsManager({
                          region: backendConfig.aws.region,
                      }),
                  ),
              ];

    const updatingSecrets = await createUpdatingSecrets(defineBackendSecrets(deployEnv), adapters, {
        lazyFailure: deployEnv === DeployEnv.Dev,
    });

    return updatingSecrets;
}

export type SecretsClient = Awaited<ReturnType<typeof createSecretsClient>>;
