import {HttpStatus} from '@augment-vir/common';
import {EmailCodeType, preparePassword, type TemplateService} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {doesPasswordMatchHash} from 'auth-vir';
import {normalizeEmailAddress} from 'parse-email-address';
import {type BackendContext} from '../create-backend-context.js';

export async function signUp(
    this: void,
    {
        context,
        requestData,
        request,
    }: EndpointImplementationParams<BackendContext, TemplateService['endpoints']['/sign-up']>,
): Promise<EndpointImplementationOutput<TemplateService['endpoints']['/sign-up']['ResponseType']>> {
    const normalizedEmailAddress = normalizeEmailAddress(requestData.emailAddress);

    if (!normalizedEmailAddress) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Invalid email address.',
        };
    }

    const preparedPassword = await preparePassword(
        requestData.password,
        context.envClient.backendConfig.universalConfig,
    );

    if (!preparedPassword.password) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: preparedPassword.failureReason,
        };
    }

    const hashedPassword = preparedPassword.password.hashed;

    const existingUser = await context.prismaClient.user.findFirst({
        where: {
            normalizedEmailAddress,
            deactivatedAt: null,
        },
        select: {
            id: true,
            accountVerifiedAt: true,
            emailAddress: true,
            password: true,
        },
    });

    if (existingUser) {
        if (
            !existingUser.accountVerifiedAt &&
            (await doesPasswordMatchHash({
                password: requestData.password,
                hash: existingUser.password,
            }))
        ) {
            void context.emailClient.sendVerificationCode(
                request.headers.origin || '',
                {
                    emailAddress: existingUser.emailAddress,
                    id: existingUser.id,
                },
                EmailCodeType.AccountVerification,
            );
        }

        return {
            statusCode: HttpStatus.Ok,
        };
    }

    const newUser = await context.prismaClient.user.create({
        data: {
            password: hashedPassword,
            emailAddress: requestData.emailAddress,
            normalizedEmailAddress,
        },
        select: {
            id: true,
            accountVerifiedAt: true,
            emailAddress: true,
        },
    });

    void context.emailClient.sendVerificationCode(
        request.headers.origin || '',
        {
            emailAddress: newUser.emailAddress,
            id: newUser.id,
        },
        EmailCodeType.AccountVerification,
    );

    return {
        statusCode: HttpStatus.Ok,
    };
}
