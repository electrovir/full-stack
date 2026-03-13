import {wait} from '@augment-vir/common';
import {writeFileAndDir} from '@augment-vir/node';
import {DeployEnv} from '@evir/common';
import {join} from 'node:path';
import {notCommittedDirPath, testsDirPath} from '../../data/file-paths.js';
import {type BackendEnvClient} from './backend-env.client.js';

export enum AdminAlertSeverity {
    Emergency = 'emergency',
    Warning = 'warning',
    Info = 'info',
}

export class AdminAlertClient {
    constructor(
        protected readonly clients: Readonly<{
            backendEnvClient: Readonly<BackendEnvClient>;
        }>,
    ) {}

    public async sendAlert(severity: AdminAlertSeverity, message: string) {
        if (this.clients.backendEnvClient.deployEnv === DeployEnv.Dev) {
            const devAlertsPath = this.clients.backendEnvClient.testName
                ? join(testsDirPath, 'alerts')
                : join(notCommittedDirPath, 'alerts');

            await wait({
                milliseconds: 1,
            });
            await writeFileAndDir(join(devAlertsPath, `${severity}-${Date.now()}.txt`), message);
        } else {
            /**
             * YOU SHOULD UPDATE THIS
             *
             * Send alerts to admins here, via Slack, email, etc.
             */
        }
    }
}
