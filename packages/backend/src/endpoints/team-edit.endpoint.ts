import {removeNullishValues, selectFrom} from '@augment-vir/common';
import {type BackendService, type Team} from '@evir/common';
import {getTeamIdToUpdate, hasValidTeamPermission} from '@evir/common-backend';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {type BackendContext, hasAuthenticatedUser} from '../context/create-backend-context.js';

export async function teamEditEndpoint(
    this: void,
    {
        context,
        requestData,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/team/edit']>,
): Promise<
    EndpointImplementationOutput<BackendService['endpoints']['/team/edit']['ResponseType']>
> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (
        !hasValidTeamPermission(context.authenticatedUser, {
            canEditTeamDetails: true,
        })
    ) {
        return {
            statusCode: HttpStatus.Forbidden,
        };
    } else if (context.authenticatedUser.isInternalAdmin && !requestData.teamId) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Admins must always provide team id when editing teams.',
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

    const editUpdates = removeNullishValues(
        selectFrom(requestData, {
            isTeamApprovedByAdmin: context.authenticatedUser.isInternalAdmin,
            isTestTeam: context.authenticatedUser.isInternalAdmin,

            /** This is the only field that can be edited by non-admin users. */
            teamName: true,
        }),
    );

    await context.prismaClient.team.update({
        where: {
            id: teamIdToUpdate,
        },
        data: editUpdates,
    });

    return {
        statusCode: HttpStatus.Ok,
    };
}
