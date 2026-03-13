import {check} from '@augment-vir/assert';
import {
    mapEnumToObject,
    mapObjectValues,
    type Overwrite,
    type SelectFrom,
    type Values,
} from '@augment-vir/common';
import {type AnyDuration} from 'date-vir';
import {EmailCodeType} from '../database-exports-for-common.js';
import {DeployEnv} from '../deploy-env.js';

/** YOU SHOULD UPDATE THIS */
const topDomain = 'example.com';

export const defaultRawUniversalConfig = {
    password: {
        minLength: 15,
    },
    /** YOU SHOULD UPDATE THIS */
    companyProperName: 'My App',
    /** YOU SHOULD UPDATE THIS */
    companyFullLegalName: 'My App Inc.',
    frontendProductionSubdomain: 'app',
    topDomain,
    selfServeSignupEnabled: false,
    services: {
        backend: {
            serviceSubdomain: 'backend',
            name: 'app-backend',
            /** In dev, this is merely the start port. */
            port: 3932,
        },
    },
    externalMarketingPage: false,
    emailCodeDuration: {
        [EmailCodeType.AccountVerification]: {
            timeout: {
                minutes: 10,
            },
            overlap: {
                seconds: 30,
            },
        },
        [EmailCodeType.PasswordReset]: {
            timeout: {
                minutes: 10,
            },
            overlap: {
                seconds: 30,
            },
        },
        [EmailCodeType.ChangedEmailVerification]: {
            timeout: {
                minutes: 10,
            },
            overlap: {
                seconds: 30,
            },
        },
        [EmailCodeType.UserInvitation]: {
            timeout: {
                weeks: 1,
            },
            overlap: {
                seconds: 30,
            },
        },
    } satisfies Record<
        EmailCodeType,
        {
            /** How long the code is valid for. */
            timeout: AnyDuration;
            /** How long before the user can request another code. */
            overlap: AnyDuration;
        }
    >,
    byEnv: {
        supportEmail: mapEnumToObject(DeployEnv, (env) => {
            const domain = [
                env === DeployEnv.Prod ? '' : env,
                topDomain,
            ]
                .filter(check.isTruthy)
                .join('.');

            return {
                /** Support email address for users. */
                support: [
                    'support',
                    domain,
                ].join('@'),
                /**
                 * Used for more exposed access: for people that haven't even created an account
                 * yet.
                 */
                hello: [
                    'hello',
                    domain,
                ].join('@'),
            };
        }),
    } satisfies Record<string, Record<DeployEnv, any>>,
};

/** Config for both frontend and backend. */
export type RawUniversalConfig = typeof defaultRawUniversalConfig;

export type UniversalConfig = Overwrite<
    RawUniversalConfig,
    {
        byEnv: {
            [Key in keyof RawUniversalConfig['byEnv']]: Values<RawUniversalConfig['byEnv'][Key]>;
        };
    }
>;

export function mapUniversalConfig(
    deployEnv: DeployEnv,
    rawUniversalConfig: Readonly<RawUniversalConfig>,
): UniversalConfig {
    return {
        ...rawUniversalConfig,
        byEnv: mapObjectValues(rawUniversalConfig.byEnv, (key, envConfigMap) => {
            return envConfigMap[deployEnv];
        }),
    };
}

export function createFrontendUrl(
    deployEnv: DeployEnv,
    universalConfig: Readonly<
        SelectFrom<
            UniversalConfig,
            {
                topDomain: true;
                frontendProductionSubdomain: true;
            }
        >
    >,
) {
    const host: string = [
        deployEnv === DeployEnv.Prod ? '' : deployEnv,
        universalConfig.frontendProductionSubdomain,
        universalConfig.topDomain,
    ]
        .filter(check.isTruthy)
        .join('.');

    return {
        host,
        origin: `https://${host}`,
    };
}

export function createProductionBackendUrl(
    universalConfig: Readonly<
        SelectFrom<
            UniversalConfig,
            {
                topDomain: true;
                services: {
                    backend: {
                        serviceSubdomain: true;
                    };
                };
            }
        >
    >,
) {
    return `https://${universalConfig.services.backend.serviceSubdomain}.${universalConfig.topDomain}`;
}
