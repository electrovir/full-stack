import {HttpStatus} from '@augment-vir/common';
import {EmailCodeType, EventLogName, getOffsetDateInIso, type BackendService} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {negateDuration} from 'date-vir';
import {isValidEmailAddress, normalizeEmailAddress} from 'parse-email-address';
import {type BackendContext} from '../context/create-backend-context.js';

export async function updateEmailAddress(
    this: void,
    {
        context,
        requestData,
        request,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/update-email-address']
    >,
): Promise<
    EndpointImplementationOutput<
        BackendService['endpoints']['/update-email-address']['ResponseType']
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
    }

    // Use normalized email addresses for case-insensitive comparison
    const normalizedNewEmail = normalizeEmailAddress(requestData.newEmailAddress);

    if (!normalizedNewEmail) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Invalid email address.',
        };
    } else if (context.authenticatedUser.normalizedEmailAddress === normalizedNewEmail) {
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
                gte: getOffsetDateInIso(
                    negateDuration(
                        context.backendEnvClient.universalConfig.emailCodeDuration[
                            EmailCodeType.ChangedEmailVerification
                        ].overlap,
                    ),
                ),
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
            responseErrorMessage: 'Please wait a few minutes before updating your email again.',
        };
    }

    await context.emailClient.sendVerificationCode({
        request,
        relevantTeam: context.authenticatedUser.selectedTeam?.team,
        toEmailAddress: context.authenticatedUser.emailAddress,
        codeForUser: context.authenticatedUser,
        codeType: EmailCodeType.ChangedEmailVerification,
    });

    await context.eventLogClient.logEvent(EventLogName.EmailChangeRequested, request, {
        data: {
            newEmailAddress: normalizedNewEmail,
        },
        relations: {
            userId: context.authenticatedUser.id,
            teamId: context.authenticatedUser.selectedTeam?.team.id,
        },
    });

    return {
        statusCode: HttpStatus.Ok,
    };
}
