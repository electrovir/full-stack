import {selectFrom} from '@augment-vir/common';
import {type BackendService, EventLogName} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {convertTemplateToString, html} from 'element-vir';
import {type BackendContext, hasAuthenticatedUser} from '../context/create-backend-context.js';

export async function feedbackEndpoint(
    this: void,
    {
        context,
        requestData,
        request,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/feedback']>,
): Promise<EndpointImplementationOutput<BackendService['endpoints']['/feedback']['ResponseType']>> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    }

    const emailContent = html`
        <h3>User Feedback:</h3>
        <p style="border: 1px solid black;">${requestData.feedback}</p>

        <ol>
            <li>Start URL: ${requestData.startUrl}</li>
            <li>Submit URL: ${requestData.submitUrl}</li>
        </ol>
    `;

    await context.emailClient.sendEmail({
        relevantRequest: request,
        subject: 'User feedback received',
        html: convertTemplateToString(emailContent),
        text: JSON.stringify(requestData),
        toAddresses: [
            context.backendEnvClient.universalConfig.byEnv.supportEmail.support,
        ],
        sentBecauseOf: {
            sentBecauseOfUserId: context.authenticatedUser.id,
        },
        relevantTeamId: context.authenticatedUser.selectedTeam?.team.id,
    });

    await context.eventLogClient.logEvent(EventLogName.UserFeedbackSent, request, {
        data: selectFrom(requestData, {
            startUrl: true,
            submitUrl: true,
        }),
        relations: {
            teamId: context.authenticatedUser.selectedTeam?.team.id,
            userId: context.authenticatedUser.id,
        },
    });

    return {
        statusCode: HttpStatus.Ok,
    };
}
