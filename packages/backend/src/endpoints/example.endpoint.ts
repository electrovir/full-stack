import {type BackendService} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
    HttpStatus,
} from '@rest-vir/implement-service';
import {type BackendContext, hasAuthenticatedUser} from '../context/create-backend-context.js';

// eslint-disable-next-line @typescript-eslint/require-await
export async function exampleEndpoint(
    this: void,
    {context}: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/health']>,
): Promise<EndpointImplementationOutput<BackendService['endpoints']['/health']['ResponseType']>> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (!context.authenticatedUser.isInternalAdmin) {
        return {
            statusCode: HttpStatus.Forbidden,
        };
    }

    return {
        statusCode: HttpStatus.Ok,
        responseData: 'ok',
    };
}
