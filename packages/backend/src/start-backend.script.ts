import {log} from '@augment-vir/common';
import {DeployEnv} from '@evir/common';
import {
    BackendServiceKey,
    createBackendClientInterface,
    parseBackendCliArgs,
} from '@evir/common-backend';
import {startService} from '@rest-vir/run-service';
import {implementBackend} from './backend-service-implementation.js';

log.faint('Starting backend...');
const cliArgs = parseBackendCliArgs(process.argv, import.meta);
const backendClientInterface = await createBackendClientInterface({
    ...cliArgs,
    test: cliArgs.testName,
    serviceKey: BackendServiceKey.Backend,
});
const implementedService = implementBackend(backendClientInterface);

const output = await startService(implementedService, {
    host: '0.0.0.0',
    port:
        cliArgs.port ||
        backendClientInterface.backendEnvClient.universalConfig.services.backend.port,
    lockPort: !!cliArgs.port,

    ...(backendClientInterface.backendEnvClient.deployEnv === DeployEnv.Dev
        ? {
              /** PGlite databases do not support multiple connections. */
              workerCount: 1,
          }
        : {}),
});

backendClientInterface.backendEnvClient.serverPort = output.port;

log.faint('Backend started');
