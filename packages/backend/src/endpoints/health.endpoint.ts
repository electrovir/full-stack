import {type BackendService} from '@evir/common';
import {type EndpointImplementationOutput, HttpStatus} from '@rest-vir/implement-service';

export function healthEndpoint(
    this: void,
): EndpointImplementationOutput<BackendService['endpoints']['/health']['ResponseType']> {
    return {
        statusCode: HttpStatus.Ok,
        responseData: 'ok',
    };
}
