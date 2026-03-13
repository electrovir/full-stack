import {baseNcuConfig} from '@virmator/deps/configs/ncu.config.base.js';
import {RunOptions} from 'npm-check-updates';

export const ncuConfig: RunOptions = {
    ...baseNcuConfig,
    // exclude these
    reject: [
        ...baseNcuConfig.reject,

        /** All playwright packages need to be kept in sync with our docker image versions. */
        '@playwright/test',
        'playwright',

        /** Prisma updates usually require their own PR. */
        'prisma',
        '@prisma/client',
        '@prisma/adapter-pg',
    ],
    // include only these
    filter: [],
};
