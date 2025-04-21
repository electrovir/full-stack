import {HttpStatus, omitObjectKeys, selectFrom} from '@augment-vir/common';
import {DeployEnv, EmailCodeType, type TemplateService} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {doesPasswordMatchHash, generateSuccessfulLoginHeaders} from 'auth-vir';
import {type BackendContext} from '../create-backend-context.js';

export async function login(
    this: void,
    {
        context,
        requestData,
        request,
        service,
    }: EndpointImplementationParams<BackendContext, TemplateService['endpoints']['/login']>,
): Promise<EndpointImplementationOutput<TemplateService['endpoints']['/login']['ResponseType']>> {
    const userByEmail = await context.prismaClient.user.findFirst({
        where: {
            emailAddress: requestData.emailAddress,
            deactivatedAt: null,
        },
        select: {
            id: true,
            password: true,
            accountVerifiedAt: true,
            emailAddress: true,
        },
    });

    if (
        !userByEmail ||
        !(await doesPasswordMatchHash({
            password: requestData.password,
            hash: userByEmail.password,
        }))
    ) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    }

    if (userByEmail.accountVerifiedAt) {
        const headers = await generateSuccessfulLoginHeaders(userByEmail.id, {
            cookieDuration: context.envClient.backendConfig.authCookieDuration,
            hostOrigin: service.serviceOrigin,
            jwtParams: context.jwtClient.jwtParams,
            isDev: context.envClient.deployEnv === DeployEnv.Dev,
        });

        return {
            statusCode: HttpStatus.Ok,
            responseData: selectFrom(userByEmail, {
                emailAddress: true,
            }),
            headers,
        };
    } else {
        /**
         * Send another account verification code if their email / account has still not been
         * verified.
         */
        void context.emailClient.sendVerificationCode(
            request.headers.origin || '',
            omitObjectKeys(userByEmail, ['password']),
            EmailCodeType.AccountVerification,
        );

        return {
            statusCode: HttpStatus.Ok,
            responseData: {
                emailSent: true,
            },
        };
    }
}
