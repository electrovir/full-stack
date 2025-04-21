import {AnyOrigin, defineService, HttpMethod, type RestVirApi} from '@rest-vir/define-service';
import {defineShape, enumShape, exact, optional, or} from 'object-shape-tester';
import {parseUrl} from 'url-vir';
import {DeployEnv} from './deploy-env.js';
import {EmailCodeType} from './prisma-types.js';

const productionHost = 'example.com';
const servicePort = 3932;

const hostNames: Record<DeployEnv, string> = {
    [DeployEnv.Dev]: 'localhost',
    [DeployEnv.Staging]: `staging.${productionHost}`,
    [DeployEnv.Prod]: productionHost,
};

export const templateServiceConfig = {
    clientOriginRequirements: {
        [DeployEnv.Dev](origin: string | undefined) {
            return !!origin && parseUrl(origin).hostname === 'localhost';
        },
        [DeployEnv.Staging]: `https://${hostNames[DeployEnv.Staging]}`,
        [DeployEnv.Prod]: `https://${hostNames[DeployEnv.Prod]}`,
    },
    serviceOrigins: {
        [DeployEnv.Dev]: `http://${hostNames[DeployEnv.Dev]}:${servicePort}`,
        [DeployEnv.Staging]: `https://backend.${hostNames[DeployEnv.Staging]}`,
        [DeployEnv.Prod]: `https://backend.${hostNames[DeployEnv.Prod]}`,
    },
    hostNames,
    servicePort,
};

/** The same shape for all endpoints that respond with a user. */
export const userResponseShape = defineShape(
    {
        emailAddress: '',
    },
    true,
);

export type UserResponse = typeof userResponseShape.runtimeType;

export type TemplateService = ReturnType<typeof defineTemplateService>;
export type TemplateServiceApi = RestVirApi<TemplateService>;

export function defineTemplateService(deployEnv: DeployEnv) {
    return defineService({
        serviceName: 'template-service',
        requiredClientOrigin: templateServiceConfig.clientOriginRequirements[deployEnv],
        serviceOrigin: templateServiceConfig.serviceOrigins[deployEnv],
        endpoints: {
            /** This endpoint should always be first so that it is used by the dev port scanner. */
            '/health': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: exact('ok'),
                requiredClientOrigin: AnyOrigin,
            },
            /** Same as `/health`. */
            '/': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: exact('ok'),
                requiredClientOrigin: AnyOrigin,
            },
            '/reset-password': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    emailAddress: '',
                },
                responseDataShape: undefined,
            },
            '/update-email-address': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    newEmailAddress: '',
                },
                responseDataShape: undefined,
            },
            /** Get user information from an active session. */
            '/user': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: userResponseShape,
            },
            '/sign-up': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    emailAddress: '',
                    password: '',
                },
                responseDataShape: undefined,
            },
            '/login': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    emailAddress: '',
                    password: '',
                },
                responseDataShape: or(userResponseShape, {emailSent: exact(true)}),
            },
            '/verify': {
                methods: {[HttpMethod.Post]: true},
                requestDataShape: {
                    /** The database id of the code to verify. */
                    id: '',
                    /** The randomized code to verify. */
                    code: '',
                    /** The type of the code to verify. */
                    codeType: enumShape(EmailCodeType),
                    /** A new password for password reset code verification. */
                    newPassword: optional(''),
                },
                responseDataShape: undefined,
            },
        },
    });
}
