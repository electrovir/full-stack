import {defaultUniversalConfig, DeployEnv, EmailCodeType} from '@evir/common';
import {type Duration, type DurationUnit} from 'date-vir';

export const defaultBackendConfig = {
    aws: {
        region: 'us-west-2',
    },
    /** Addresses that emails will be sent from in deployed environments. */
    fromEmailAddress: {
        [DeployEnv.Prod]: `support@${defaultUniversalConfig.productionHost}`,
        [DeployEnv.Staging]: `support@staging.${defaultUniversalConfig.productionHost}`,
    },
    /** Frontend origins for deployed environments. */
    clientOrigin: {
        [DeployEnv.Prod]: `https://${defaultUniversalConfig.productionHost}`,
        [DeployEnv.Staging]: `https://staging.${defaultUniversalConfig.productionHost}`,
    },
    authCookieDuration: {
        hours: 2,
    },
    emailCodeDuration: {
        [EmailCodeType.AccountVerification]: {
            timeout: {minutes: 10},
            overlap: {minutes: 10},
        },
        [EmailCodeType.PasswordReset]: {
            timeout: {minutes: 10},
            overlap: {minutes: 10},
        },
        [EmailCodeType.ChangedEmailVerification]: {
            timeout: {minutes: 10},
            overlap: {minutes: 2},
        },
    } satisfies Record<
        EmailCodeType,
        {
            /** How long the code is valid for. */
            timeout: Duration<DurationUnit.Minutes>;
            /** How long before the user can request another code. */
            overlap: Duration<DurationUnit.Minutes>;
        }
    >,
    universalConfig: defaultUniversalConfig,
};

export type BackendConfig = typeof defaultBackendConfig;
