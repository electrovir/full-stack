import {selectFrom} from '@augment-vir/common';
import {defineTemplateService, DeployEnv, EmailCodeType} from '@evir/common';
import {HttpStatus, implementService, type ContextInitOutput} from '@rest-vir/implement-service';
import {csrfTokenHeaderName} from 'auth-vir';
import {type BackendClientInterface} from '../backend-client-interface/backend-client-interface.js';
import {createBackendContext, type BackendContext} from './create-backend-context.js';
import {login} from './endpoints/login.endpoint.js';
import {signUp} from './endpoints/sign-up.endpoint.js';
import {updateEmailAddress} from './endpoints/update-email-address.endpoint.js';
import {verify} from './endpoints/verify.endpoint.js';

export function implementTemplateService(backendClientInterface: Readonly<BackendClientInterface>) {
    const service = defineTemplateService(backendClientInterface.envClient.deployEnv);
    return implementService({
        service,
        customHeaders: [csrfTokenHeaderName],
        async createContext({
            requestHeaders,
            endpointDefinition,
        }): Promise<ContextInitOutput<BackendContext>> {
            if (!endpointDefinition) {
                return {
                    reject: {
                        statusCode: HttpStatus.NotFound,
                    },
                };
            }
            return await createBackendContext(
                backendClientInterface,
                requestHeaders,
                endpointDefinition,
            );
        },
    })({
        endpoints: {
            '/health'() {
                return {
                    statusCode: HttpStatus.Ok,
                    responseData: 'ok',
                };
            },
            '/'() {
                return {
                    statusCode: HttpStatus.Ok,
                    responseData: 'ok',
                };
            },
            async '/reset-password'({context, requestData, request, log}) {
                const existingUser = await context.prismaClient.user.findFirst({
                    where: {
                        emailAddress: requestData.emailAddress,
                        deactivatedAt: null,
                    },
                    select: {
                        id: true,
                        emailAddress: true,
                    },
                });

                if (existingUser) {
                    void context.emailClient.sendVerificationCode(
                        request.headers.origin || '',
                        existingUser,
                        EmailCodeType.PasswordReset,
                    );
                } else if (context.envClient.deployEnv == DeployEnv.Dev) {
                    log.error(
                        new Error(
                            `Cannot send password reset email to missing user ${requestData.emailAddress}`,
                        ),
                    );
                }

                return {
                    statusCode: HttpStatus.Ok,
                };
            },
            '/login': login,
            '/sign-up': signUp,
            '/update-email-address': updateEmailAddress,
            '/user'({context}) {
                if (!context.authenticatedUser) {
                    return {
                        statusCode: HttpStatus.Unauthorized,
                    };
                }

                return {
                    statusCode: HttpStatus.Ok,
                    responseData: selectFrom(context.authenticatedUser, {
                        emailAddress: true,
                    }),
                };
            },
            '/verify': verify,
        },
    });
}
