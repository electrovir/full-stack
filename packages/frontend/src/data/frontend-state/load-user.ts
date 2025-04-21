import {type TemplateServiceApi, type UserResponse} from '@evir/common';
import {getCurrentCsrfToken} from 'auth-vir';

export async function loadUser(
    apiPromise: Promise<TemplateServiceApi>,
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
