import {type MaybePromise} from '@augment-vir/common';
import {type BackendApi, type UserResponse} from '@evir/common';
import {getCurrentCsrfToken} from 'auth-vir';

/** Get the currently signed in user. */
export async function loadUser(
    apiPromise: MaybePromise<BackendApi>,
): Promise<UserResponse | undefined> {
    const csrfToken = getCurrentCsrfToken();

    if (csrfToken) {
        const api = await apiPromise;
        const output = await api.endpoints['/user'].fetch();

        if (output.ok) {
            return output.data;
        }
    }

    return undefined;
}
