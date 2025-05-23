import {HttpStatus, omitObjectKeys, selectFrom} from '@augment-vir/common';
import {EmailCodeType, type BackendService} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {doesPasswordMatchHash} from 'auth-vir';
import {type BackendContext} from '../create-backend-context.js';

export async function login(
    this: void,
    {
        context,
        requestData,
        requestHeaders,
        service,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/login']>,
): Promise<EndpointImplementationOutput<BackendService['endpoints']['/login']['ResponseType']>> {
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
        const headers = await context.authClient.createSuccessfulCookieHeaders({
            userId: userByEmail.id,
            serviceOrigin: service.serviceOrigin,
            isSignUpCookie: false,
            requestHeaders,
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
            requestHeaders.origin || '',
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
