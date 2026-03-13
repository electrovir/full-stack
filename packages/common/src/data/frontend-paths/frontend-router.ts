import {mapObject} from '@augment-vir/common';
import {routeHasPaths, type FullSpaRoute, type SpaRouter} from 'spa-router-vir';
import {DeployEnv} from '../../deploy-env.js';
import {frontendPathTree} from './frontend-path-tree.js';
import {
    testNameSearchParamKey,
    type FrontendPaths,
    type FrontendRoute,
    type FrontendSearchParamKey,
    type FrontendSearchParams,
} from './frontend-route.js';

export function createRouteSanitizer(deployEnv: DeployEnv) {
    return (rawRoute: Readonly<FullSpaRoute>): FrontendRoute => {
        const sanitizedPaths = frontendPathTree.sanitizePaths(rawRoute.paths);

        return {
            hash: rawRoute.hash,
            paths: sanitizedPaths,
            search: sanitizeSearch(deployEnv, {
                ...rawRoute,
                paths: sanitizedPaths,
            }),
        };
    };
}

function sanitizeSearch(
    deployEnv: DeployEnv,
    route: Readonly<FullSpaRoute<FrontendPaths, any, any>>,
): FrontendSearchParams {
    const search = route.search as Record<string, string[] | undefined> | undefined;

    if (!search) {
        return undefined;
    }

    const enabledSearchParamKeys: Record<FrontendSearchParamKey, boolean> = {
        /** Used only on the verify endpoint. */
        code: routeHasPaths(route, frontendPathTree.paths.children.verify),
        id: routeHasPaths(route, frontendPathTree.paths.children.verify),
        type: routeHasPaths(route, frontendPathTree.paths.children.verify),
        /** Only allow in tests, which run in dev. */
        'wtr-session-id': deployEnv === DeployEnv.Dev,

        lang: true,

        [testNameSearchParamKey]: deployEnv === DeployEnv.Dev,
    };

    return mapObject(enabledSearchParamKeys, (key, enabled) => {
        const rawValue = route.search[key]?.[0];
        if (!enabled || !rawValue) {
            return undefined;
        }

        return {
            key,
            value: [rawValue] as const,
        };
    });
}

export type FrontendRouter = SpaRouter<FrontendPaths, FrontendSearchParams, string | undefined>;
