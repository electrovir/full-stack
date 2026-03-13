import {HttpStatus} from '@augment-vir/common';
import {EventLogName, type BackendService} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {hasAuthenticatedUser, type BackendContext} from '../context/create-backend-context.js';

export async function resendLinkEndpoint(
    this: void,
    {
        context,
        requestData,
        request,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/resend-link']>,
): Promise<
    EndpointImplementationOutput<BackendService['endpoints']['/resend-link']['ResponseType']>
> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (!context.authenticatedUser.selectedTeam) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Requires a selected team.',
        };
    }

    await context.emailClient.sendVerificationCode({
        codeType: requestData.codeType,
        request,
        relevantTeam: context.authenticatedUser.selectedTeam.team,
        toEmailAddress: context.authenticatedUser.emailAddress,
        codeForUser: context.authenticatedUser,
    });

    await context.eventLogClient.logEvent(EventLogName.ResendVerificationCode, request, {
        data: {
            codeType: requestData.codeType,
            emailAddress: context.authenticatedUser.emailAddress,
        },
        relations: {
            userId: context.authenticatedUser.id,
            teamId: context.authenticatedUser.selectedTeam.team.id,
        },
    });

    return {
        statusCode: HttpStatus.Ok,
    };
}
