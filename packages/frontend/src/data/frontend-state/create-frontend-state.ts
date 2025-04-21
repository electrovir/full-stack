import {DeferredPromise} from '@augment-vir/common';
import {
    type TemplateServiceApi,
    defaultFrontendRoute,
    defaultUniversalConfig,
    sanitizeRoute,
} from '@evir/common';
import {asyncProp} from 'element-vir';
import {SpaRouter} from 'spa-router-vir';
import {loadApi} from './api.js';
import {determineFrontendDeployEnv} from './determine-deploy-env.js';
import {loadUser} from './load-user.js';

export function createFrontendState() {
    const deployEnv = determineFrontendDeployEnv(window.location.hostname);

    const deferredApi = new DeferredPromise<TemplateServiceApi>();

    const asyncUser = asyncProp({
        defaultValue: loadUser(deferredApi.promise),
    });

    loadApi(deployEnv, asyncUser)
        .then((result) => deferredApi.resolve(result))
        .catch((error: unknown) => deferredApi.reject(error));

    return {
        router: new SpaRouter({sanitizeRoute}),
        currentRoute: defaultFrontendRoute,
        debug: false,
        deployEnv,
        api: asyncProp({defaultValue: deferredApi.promise}),
        user: asyncUser,
        config: defaultUniversalConfig,
    };
}
