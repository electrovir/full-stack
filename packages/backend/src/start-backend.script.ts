import {checkWrap} from '@augment-vir/assert';
import {extractRelevantArgs, runShellCommand} from '@augment-vir/node';
import {DeployEnv} from '@evir/common';
import {startService} from '@rest-vir/run-service';
import {createBackendClientInterface} from './backend-client-interface/backend-client-interface.js';
import {implementTemplateService} from './service/service-implementation.js';

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
const backendClientInterface = await createBackendClientInterface(cliArgs);
const implementedService = implementTemplateService(backendClientInterface);

await startService(
    implementedService,
    cliArgs.deployEnv === DeployEnv.Dev
        ? {
              /** Backend PGlite databases do not support multiple connections. */
              workerCount: 1,
          }
        : {},
);
