import {checkWrap} from '@augment-vir/assert';
import {log, mergeDeep} from '@augment-vir/common';
import {runShellCommand} from '@augment-vir/node';
import {defineConfig} from '@virmator/frontend/configs/vite.config.base.js';
import {resolve} from 'node:path';
import {visualizer} from 'rollup-plugin-visualizer';
import {InjectedGlobalData} from '../src/data/frontend-state/global-data';
// import {sentryVitePlugin} from '@sentry/vite-plugin';

const backendPort = checkWrap.isNumber(Number(process.env.BACKEND_PORT));
const frontendPort = checkWrap.isNumber(Number(process.env.FRONTEND_PORT));
const commitHash =
    process.env.COMMIT_REF ||
    (await runShellCommand('git rev-parse HEAD')).stdout.trim() ||
    'UNKNOWN';

if (backendPort) {
    log.info(`Backend port: ${backendPort}`);
}
if (frontendPort) {
    log.info(`Frontend port: ${frontendPort}`);
}

export default defineConfig(
    {
        forGitHubPages: false,
        packageDirPath: resolve(import.meta.dirname, '..'),
    },
    async (baseConfig, basePaths) => {
        return mergeDeep(baseConfig, {
            ...(frontendPort
                ? {
                      server: {
                          port: frontendPort,
                      },
                  }
                : {}),
            // resolve: {
            //     ...(baseConfig.resolve || {}),
            //     alias: {
            //         ...(baseConfig.resolve?.alias || {}),
            //         '@web/test-runner-commands': resolve(
            //             basePaths.srcDir,
            //             'shims/web-test-runner-commands.ts',
            //         ),
            //     },
            // },
            plugins: [
                ...(baseConfig.plugins || []),
                /** It still works... so I don't care if the types are wrong. */
                visualizer({filename: 'build-size.html'}) as any,
                // YOU SHOULD UPDATE THIS (uncomment and fill in org/project)
                // sentryVitePlugin({
                //     org: '',
                //     telemetry: false,
                //     project: '',
                //     disable: !process.env.CI,
                //     authToken: process.env.SENTRY_AUTH_TOKEN,
                //     release: {
                //         name: commitHash,
                //     },
                //     sourcemaps: {
                //         filesToDeleteAfterUpload: '**/dist/*.map',
                //     },
                //     errorHandler(error: unknown) {
                //         log.error('Sentry plugin failed', error);
                //     },
                // }),
            ],
            define: {
                VITE_INJECTED_DATA: JSON.stringify({
                    release: commitHash,
                    ...(backendPort ? {backendPort} : {}),
                } satisfies InjectedGlobalData),
            },
        });
    },
);
