import {type BackendService} from '@evir/common';
import {
    HttpStatus,
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {type BackendContext} from '../context/create-backend-context.js';
import {createNewUser} from './common/create-user.js';

export async function signUpEndpoint(
    this: void,
    params: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/sign-up']>,
): Promise<EndpointImplementationOutput<BackendService['endpoints']['/sign-up']['ResponseType']>> {
    if (!params.requestData.password) {
        return {
            statusCode: HttpStatus.BadRequest,
            responseErrorMessage: 'Missing password',
        };
    }

    return createNewUser(
        false,
        {
            requireEmailVerification: true,
            emailAddress: params.requestData.emailAddress,
            password: params.requestData.password,
            selfServeInfo: params.requestData.info,
            teamId: undefined,
        },
        params,
    );
}
