import {awaitedBlockingMap, indent, log, trimArrayStrings} from '@augment-vir/common';
import {type BackendService, DeployEnv} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {type BackendContext, hasAuthenticatedUser} from '../../context/create-backend-context.js';

export async function internalAdminDevDbEndpoint(
    this: void,
    {
        requestData,
        context,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/internal-admin/dev-db']
    >,
): Promise<EndpointImplementationOutput> {
    /** IF YOU REMOVE THIS CHECK THE PROD DATABASE WILL BE EXPOSED. DO NOT REMOVE THIS CHECK. */
    if (context.backendEnvClient.deployEnv !== DeployEnv.Dev) {
        return {
            statusCode: HttpStatus.NotFound,
        };
    } else if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (!context.authenticatedUser.isInternalAdmin) {
        return {
            statusCode: HttpStatus.Forbidden,
        };
    }

    const results = await awaitedBlockingMap(
        trimArrayStrings(requestData.query.split(';')),
        async (query) => {
            const finalQuery = `${query.trim()};`;
            log.faint(`Running query:\n${indent(finalQuery)}`);
            return await context.prismaClient.$queryRawUnsafe(finalQuery);
        },
    );

    return {
        statusCode: HttpStatus.Ok,
        responseData: results.flat(),
    };
}
