import {ensureErrorAndPrependMessage} from '@augment-vir/common';
import {type BackendService, type Team} from '@evir/common';
import {getTeamIdToUpdate, hasValidTeamPermission} from '@evir/common-backend';
import {
    HttpStatus,
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {getNowInIsoString} from 'date-vir';
import {handleError} from 'sentry-vir';
import {hasAuthenticatedUser, type BackendContext} from '../context/create-backend-context.js';

export async function userDeactivateEndpoint(
    this: void,
    {
        context,
        requestData,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/user/deactivate']
    >,
): Promise<
    EndpointImplementationOutput<BackendService['endpoints']['/user/deactivate']['ResponseType']>
> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (
        !hasValidTeamPermission(context.authenticatedUser, {
            canManageUsers: true,
        })
    ) {
        return {
            statusCode: HttpStatus.Forbidden,
        };
    } else if (context.authenticatedUser.isInternalAdmin && !requestData.teamId) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Admins must always provide team id when deactivating a user.',
        };
    }

    const teamIdToUpdate: Team['id'] | undefined = getTeamIdToUpdate(
        context.authenticatedUser,
        requestData,
    );

    if (!teamIdToUpdate) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Invalid team id.',
        };
    }

    try {
        /** Verify the user belongs to this team. */
        const teamPermission = await context.prismaClient.teamPermission.findUnique({
            where: {
                userId_teamId: {
                    userId: requestData.userId,
                    teamId: teamIdToUpdate,
                },
                isEnabled: true,
            },
            select: {
                id: true,
            },
        });

        if (!teamPermission) {
            return {
                statusCode: HttpStatus.NotFound,
                responseErrorMessage: 'User not found in team.',
            };
        }

        await context.prismaClient.user.update({
            where: {
                deactivatedAt: null,
                id: requestData.userId,
            },
            data: {
                deactivatedAt: getNowInIsoString(),
            },
        });

        return {
            statusCode: HttpStatus.Ok,
        };
    } catch (error) {
        handleError(ensureErrorAndPrependMessage(error, 'Failed to deactivate user.'), {
            context: requestData,
            tags: {
                userId: requestData.userId,
                teamId: teamIdToUpdate,
            },
        });
        return {
            statusCode: HttpStatus.BadRequest,
        };
    }
}
