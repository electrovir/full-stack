import {ensureErrorAndPrependMessage, removeNullishValues, selectFrom} from '@augment-vir/common';
import {type BackendService, type Team, teamPermissionSelection} from '@evir/common';
import {getTeamIdToUpdate, hasValidTeamPermission} from '@evir/common-backend';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {handleError} from 'sentry-vir';
import {type BackendContext, hasAuthenticatedUser} from '../context/create-backend-context.js';

export async function userEditEndpoint(
    this: void,
    {
        context,
        requestData,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/user/edit']>,
): Promise<
    EndpointImplementationOutput<BackendService['endpoints']['/user/edit']['ResponseType']>
> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (
        hasValidTeamPermission(context.authenticatedUser, {
            canManageUsers: true,
        })
    ) {
        return {
            statusCode: HttpStatus.Forbidden,
        };
    } else if (context.authenticatedUser.isInternalAdmin && !requestData.teamId) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Admins must always provide team id when editing a user.',
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

        /** Update user fields. */
        const userUpdates = removeNullishValues(
            selectFrom(requestData, {
                humanName: true,
                isInternalAdmin: true,
                isTestUser: true,
                emailAddress: true,
            }),
        );

        if (Object.keys(userUpdates).length) {
            await context.prismaClient.user.update({
                where: {
                    id: requestData.userId,
                },
                data: userUpdates,
            });
        }

        /** Update permission fields on TeamPermission. */
        const permissionUpdates = removeNullishValues(
            selectFrom(requestData, teamPermissionSelection),
        );

        if (Object.keys(permissionUpdates).length) {
            await context.prismaClient.teamPermission.update({
                where: {
                    userId_teamId: {
                        userId: requestData.userId,
                        teamId: teamIdToUpdate,
                    },
                },
                data: permissionUpdates,
            });
        }

        return {
            statusCode: HttpStatus.Ok,
        };
    } catch (error) {
        handleError(ensureErrorAndPrependMessage(error, 'Failed to edit user.'), {
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
