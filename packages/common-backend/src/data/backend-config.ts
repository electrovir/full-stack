import {check} from '@augment-vir/assert';
import {mapEnumToObject} from '@augment-vir/common';
import {createFrontendUrl, defaultRawUniversalConfig, DeployEnv} from '@evir/common';

export type AllowedEmailDomains = Partial<Record<DeployEnv, string[]>>;

export const defaultBackendConfig = {
    /** Addresses that emails will be sent from in deployed environments. */
    fromEmailAddress: mapEnumToObject(DeployEnv, (env) => {
        const domain = [
            env === DeployEnv.Prod ? '' : env,
            defaultRawUniversalConfig.topDomain,
        ]
            .filter(check.isTruthy)
            .join('.');

        return `support@${domain}`;
    }),
    mailFromDomain: [
        'mail',
        defaultRawUniversalConfig.topDomain,
    ].join('.'),
    /** Expected frontend origins. */
    clientOrigin: mapEnumToObject(DeployEnv, (env) => {
        return createFrontendUrl(env, defaultRawUniversalConfig).origin;
    }),
    /** For the given environments, only accounts with the given email domains are allowed. */
    allowedEmailDomains: {
        [DeployEnv.Staging]: [
            defaultRawUniversalConfig.topDomain,
        ],
    } satisfies AllowedEmailDomains as AllowedEmailDomains,
    significantEmailAddresses: {
        /** YOU SHOULD UPDATE THIS */
        newSelfServeNotification: ['admin@example.com'],
    },
    /**
     * The number of failed login attempts before a user account is locked, requiring an admin to
     * unlock them.
     */
    failedLoginLockoutCount: 6,
    /** The maximum number of events allowed per user or IP before generating 429 responses. */
    eventLogMax: {
        duration: {
            minutes: 1,
        },
        count: 100,
    },
};

export type BackendConfig = typeof defaultBackendConfig;
