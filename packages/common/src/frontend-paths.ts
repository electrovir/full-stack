import {check} from '@augment-vir/assert';
import {PathTree, type FullSpaRoute, type SpaRouteByPath, type SpaRouter} from 'spa-router-vir';
import {EmailCodeType} from './prisma-types.js';

export const frontendPathTree = new PathTree({
    allowBare: true,
    children: {
        app: {
            allowBare: true,
            children: {},
        },
        design: {
            anyChildren: true,
        },
        'reset-password': {},
        'create-account': {},
        verify: {},
        legal: {},
    },
});

export type FrontendPaths = Readonly<typeof frontendPathTree.PathsType>;

export type FrontendSearchParams =
    | {
          code: ReadonlyArray<string>;
          id: ReadonlyArray<string>;
          type: Readonly<[EmailCodeType]>;
      }
    | undefined;

export type FrontendFullRoute = Readonly<
    FullSpaRoute<FrontendPaths, FrontendSearchParams, undefined>
>;

export type FrontendSpecificRoute<Paths extends FrontendFullRoute['paths']> = SpaRouteByPath<
    Paths,
    FrontendFullRoute
>;

export function matchesPath<const Paths extends FrontendPaths>(
    currentRoute: FrontendFullRoute,
    paths: Paths,
): currentRoute is FrontendSpecificRoute<Paths> {
    return paths.every((path, index) => {
        if (check.isString(path)) {
            return currentRoute.paths[index] === path;
        } else {
            return check.isEnumValue(currentRoute.paths[index], path);
        }
    });
}

export const defaultFrontendRoute: FrontendFullRoute = {
    paths: frontendPathTree.paths.fullPaths,
    hash: undefined,
    search: undefined,
};

export function sanitizeRoute(rawRoute: Readonly<FullSpaRoute>): FrontendFullRoute {
    const paths = frontendPathTree.sanitizePaths(rawRoute.paths);

    return {
        ...defaultFrontendRoute,
        search: sanitizeSearch({
            ...rawRoute,
            paths,
            hash: undefined,
        }),
        paths,
    };
}

function sanitizeSearch(
    route: Readonly<FullSpaRoute<FrontendPaths, any, undefined>>,
): FrontendSearchParams {
    if (!matchesPath(route, frontendPathTree.paths.children.verify.fullPaths) || !route.search) {
        return undefined;
    }
    const code = route.search.code[0];
    const id = route.search.id[0];
    const type = route.search.type[0];

    if (!check.isEnumValue(type, EmailCodeType)) {
        return undefined;
    }

    return {
        code: code ? [code] : [],
        id: id ? [id] : [],
        type: [type],
    };
}

export type FrontendRouter = SpaRouter<FrontendPaths, FrontendSearchParams>;
