import {HttpStatus, applyBrand} from '@augment-vir/common';
import {EventLogName, type BackendService, type LinkProxy} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {hasAuthenticatedUser, type BackendContext} from '../context/create-backend-context.js';

export async function getLinkEndpoint(
    this: void,
    {
        context,
        pathParams,
        request,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/get-link/:linkId']
    >,
): Promise<
    EndpointImplementationOutput<BackendService['endpoints']['/get-link/:linkId']['ResponseType']>
> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    }

    const matchingLink = await context.prismaClient.linkProxy.findUnique({
        where: {
            id: applyBrand<LinkProxy['id']>(pathParams.linkId),
            deactivatedAt: null,
        },
        select: {
            originalUrl: true,
            description: true,
            id: true,
        },
    });

    const url = matchingLink?.originalUrl;

    if (!url) {
        return {
            statusCode: HttpStatus.NotFound,
        };
    }

    await context.eventLogClient.logEvent(EventLogName.LinkOpen, request, {
        data: {
            description: matchingLink.description || '',
        },
        relations: {
            userId: context.authenticatedUser.id,
            teamId: context.authenticatedUser.selectedTeam?.team.id,
            linkProxyId: matchingLink.id,
        },
    });

    return {
        statusCode: HttpStatus.Ok,
        responseData: {
            link: url,
        },
    };
}
