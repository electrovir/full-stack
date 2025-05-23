import {checkWrap} from '@augment-vir/assert';
import {log} from '@augment-vir/common';
import {extractRelevantArgs, runShellCommand} from '@augment-vir/node';
import {DeployEnv} from '@evir/common';
import {startService} from '@rest-vir/run-service';
import {createBackendClientInterface} from './backend-client-interface/backend-client-interface.js';
import {implementBackend} from './service/service-implementation.js';

async function parseCliArgs() {
    const relevantArgs = extractRelevantArgs({
        binName: undefined,
        fileName: import.meta.filename,
        rawArgs: process.argv,
    });

    const deployEnv = checkWrap.isEnumValue(relevantArgs[0], DeployEnv) || DeployEnv.Dev;
    const releaseName =
        relevantArgs[1] ||
        (await runShellCommand('git rev-parse HEAD')).stdout.trim() ||
        'UNKNOWN_DEPLOY_NAME';

    return {
        deployEnv,
        releaseName,
    };
}

const cliArgs = await parseCliArgs();
log.faint('Starting backend...');
log.info(`Release: ${cliArgs.releaseName}`);
log.info(`Env: ${cliArgs.deployEnv}`);
const backendClientInterface = await createBackendClientInterface(cliArgs);
const implementedService = implementBackend(backendClientInterface);

await startService(
    implementedService,
    cliArgs.deployEnv === DeployEnv.Dev
        ? {
              /** Backend PGlite databases do not support multiple connections. */
              workerCount: 1,
          }
        : {},
);
