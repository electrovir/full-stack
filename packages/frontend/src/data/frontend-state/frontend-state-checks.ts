import {type PartialWithUndefined, type SelectFrom} from '@augment-vir/common';
import {type GenericTreePaths, routeHasPaths, type RouteHasPathsOptions} from 'spa-router-vir';
import {type FrontendState} from './frontend-state.js';

export type MatchedFrontendState<
    TreePaths extends Readonly<
        SelectFrom<
            GenericTreePaths,
            {
                fullPaths: true;
                PathsType: true;
            }
        >
    > | void,
    ExactMatch extends boolean,
    HasUser extends boolean | void,
> = TreePaths extends GenericTreePaths
    ? ExactMatch extends true
        ? Readonly<FrontendState<TreePaths['fullPaths'], HasUser>>
        : Readonly<FrontendState<TreePaths['PathsType'], HasUser>>
    : Readonly<FrontendState<void, HasUser>>;

export function stateMatches<
    const TreePaths extends Readonly<
        SelectFrom<
            GenericTreePaths,
            {
                fullPaths: true;
                PathsType: true;
            }
        >
    > | void = void,
    const ExactMatch extends boolean = false,
    const HasUser extends boolean | void = void,
>(
    frontendState: Readonly<FrontendState>,
    {
        hasUser,
        options,
        paths,
    }: PartialWithUndefined<{
        paths: TreePaths;
        options: Readonly<RouteHasPathsOptions<ExactMatch>>;
        hasUser: HasUser;
    }>,
): frontendState is MatchedFrontendState<TreePaths, ExactMatch, HasUser> {
    const pathsMatch = paths ? routeHasPaths(frontendState.currentRoute, paths, options) : true;

    const hasResolvedUser =
        frontendState.user instanceof Promise
            ? false
            : frontendState.user instanceof Error
              ? false
              : !!frontendState.user;

    const userMatch = hasUser === undefined ? true : hasUser === hasResolvedUser;

    return pathsMatch && userMatch;
}
