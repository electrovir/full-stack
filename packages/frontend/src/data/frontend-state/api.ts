import {HttpStatus, mergeDeep} from '@augment-vir/common';
import {
    defineBackendService,
    HeaderName,
    UserStatusHeaderValue,
    type BackendApi,
    type DeployEnv,
    type UserResponse,
} from '@evir/common';
import {generateApi, mapServiceDevPort} from '@rest-vir/define-service';
import {csrfTokenHeaderName, getCurrentCsrfToken, wipeCurrentCsrfToken} from 'auth-vir';
import {type AsyncProp} from 'element-vir';

export async function loadApi(
    deployEnv: DeployEnv,
    asyncUser: AsyncProp<UserResponse | undefined, any>,
): Promise<BackendApi> {
    try {
        const service = await mapServiceDevPort(defineBackendService(deployEnv));

        return generateApi(service, {
            endpointFetch: {
                async fetch(url, init) {
                    const csrfToken = getCurrentCsrfToken();
                    const extraHeaders = csrfToken
                        ? {
                              [csrfTokenHeaderName]: csrfToken,
                          }
                        : {};

                    const combinedInit = mergeDeep(init, {
                        headers: extraHeaders,
                        credentials: 'include',
                    });

                    const response = await globalThis.fetch(url, combinedInit);

                    /**
                     * If any request comes back as unauthorized then we need to immediately log out
                     * the current user.
                     */
                    if (response.status === HttpStatus.Unauthorized) {
                        asyncUser.setValue(undefined);
                        if (
                            response.headers.get(HeaderName.UserStatus) !==
                            UserStatusHeaderValue.SignUp
                        ) {
                            wipeCurrentCsrfToken();
                        }
                    }

                    return response;
                },
            },
        });
    } catch {
        throw new Error(`Failed to connect to our servers. Please check your internet connection.`);
    }
}
