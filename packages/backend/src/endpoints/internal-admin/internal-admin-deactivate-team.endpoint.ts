import {ensureErrorAndPrependMessage} from '@augment-vir/common';
import {type BackendService} from '@evir/common';
import {
    HttpStatus,
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {getNowInIsoString} from 'date-vir';
import {handleError} from 'sentry-vir';
import {hasAuthenticatedUser, type BackendContext} from '../../context/create-backend-context.js';

export async function internalAdminDeactivateTeamEndpoint(
    this: void,
    {
        context,
        requestData,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/internal-admin/deactivate-team']
    >,
): Promise<
    EndpointImplementationOutput<
        BackendService['endpoints']['/internal-admin/deactivate-team']['ResponseType']
    >
> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (!context.authenticatedUser.isInternalAdmin) {
        return {
            statusCode: HttpStatus.Forbidden,
        };
    }

    if (!requestData.teamId) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Missing team ID',
        };
    }

    try {
        await context.prismaClient.team.update({
            where: {
                id: requestData.teamId,
                deactivatedAt: null,
            },
            data: {
                deactivatedAt: getNowInIsoString(),
            },
            select: {
                id: true,
            },
        });

        return {
            statusCode: HttpStatus.Ok,
        };
    } catch (error) {
        handleError(ensureErrorAndPrependMessage(error, 'Failed to deactivate team.'), {
            context: requestData,
            tags: {
                teamId: requestData.teamId,
            },
        });

        return {
            statusCode: HttpStatus.BadRequest,
        };
    }
}
