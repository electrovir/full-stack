import {defineConfig} from '@virmator/deps/configs/dep-cruiser.config.base.js';
import {type IConfiguration} from 'dependency-cruiser';

const baseConfig = defineConfig({
    fileExceptions: {
        // enter file exceptions by rule name here
        'no-orphans': {
            from: [
                'src/index\\.ts$',
            ],
        },
        'not-to-unresolvable': {
            to: [
                'mailgun\\.js',
            ],
        },
        'not-to-mock': {
            from: [
                '\\.book\\.ts',
                'src/backend-client-interface/clients/prisma/prisma\\.client\\.ts',
            ],
        },
        'not-to-dev-dep': {
            /** These files need to access test name helpers from `@augment-vir/test`. */
            from: [
                'frontend-env\\.client\\.ts',
                'prisma\\.client\\.ts',
                'backend-env\\.client\\.ts',
            ],
        },
    },
    omitRules: [
        // enter rule names here to omit
    ],
});

const depCruiserConfig: IConfiguration = {
    ...baseConfig,
};

module.exports = depCruiserConfig;
