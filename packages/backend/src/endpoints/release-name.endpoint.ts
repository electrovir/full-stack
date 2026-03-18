import {type BackendService} from '@evir/common';
import {
    HttpStatus,
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {type BackendContext} from '../context/create-backend-context.js';

export function releaseNameEndpoint(
    this: void,
    {
        context,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/release-name']
    >,
): EndpointImplementationOutput<BackendService['endpoints']['/release-name']['ResponseType']> {
    return {
        statusCode: HttpStatus.Ok,
        responseData: context.backendEnvClient.releaseName,
    };
}
