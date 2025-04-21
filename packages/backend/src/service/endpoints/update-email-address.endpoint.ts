import {HttpStatus} from '@augment-vir/common';
import {EmailCodeType, getOffsetDbTime, type TemplateService} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {isValidEmailAddress} from 'parse-email-address';
import {type BackendContext} from '../create-backend-context.js';

export async function updateEmailAddress(
    this: void,
    {
        context,
        requestData,
        requestHeaders,
    }: EndpointImplementationParams<
        BackendContext,
        TemplateService['endpoints']['/update-email-address']
    >,
): Promise<
    EndpointImplementationOutput<
        TemplateService['endpoints']['/update-email-address']['ResponseType']
    >
> {
    if (!context.authenticatedUser) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (!isValidEmailAddress(requestData.newEmailAddress)) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Invalid email address.',
        };
    } else if (context.authenticatedUser.emailAddress === requestData.newEmailAddress) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'This is already your email address.',
        };
    }

    const existingCode = await context.prismaClient.emailCode.findFirst({
        where: {
            codeType: EmailCodeType.ChangedEmailVerification,
            user: {
                id: context.authenticatedUser.id,
                deactivatedAt: null,
            },
            createdAt: {
                gte: getOffsetDbTime({
                    minutes:
                        -context.envClient.backendConfig.emailCodeDuration[
                            EmailCodeType.ChangedEmailVerification
                        ].overlap.minutes,
                }),
            },
        },
        select: {
            id: true,
            createdAt: true,
        },
    });

    if (existingCode) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'You must wait a few minutes before updating your email again.',
        };
    }

    await context.prismaClient.user.update({
        where: {
            id: context.authenticatedUser.id,
        },
        data: {
            unverifiedNewEmailAddress: requestData.newEmailAddress,
        },
    });

    void context.emailClient.sendVerificationCode(
        requestHeaders.origin || '',
        {
            id: context.authenticatedUser.id,
            emailAddress: requestData.newEmailAddress,
        },
        EmailCodeType.ChangedEmailVerification,
    );

    return {
        statusCode: HttpStatus.Ok,
    };
}
