import {selectFrom} from '@augment-vir/common';
import {type BackendService} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {type BackendContext, hasAuthenticatedUser} from '../../context/create-backend-context.js';

export async function internalAdminCreateTeamEndpoint(
    this: void,
    {
        context,
        requestData,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/internal-admin/create-team']
    >,
): Promise<
    EndpointImplementationOutput<
        BackendService['endpoints']['/internal-admin/create-team']['ResponseType']
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

    const newTeam = await context.prismaClient.team.create({
        data: {
            teamName: requestData.teamName,
            isInternalAdminTeam: false,
            isTeamApprovedByAdmin: requestData.isTeamApprovedByAdmin,
            isTestTeam: requestData.isTestTeam,
        },
        select: {
            id: true,
            teamName: true,
        },
    });

    return {
        statusCode: HttpStatus.Ok,
        responseData: selectFrom(newTeam, {
            id: true,
            teamName: true,
        }),
    };
}
