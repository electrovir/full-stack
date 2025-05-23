import {type Overwrite} from '@augment-vir/common';
import {
    matchesPath,
    type BackendApi,
    type FrontendFullRoute,
    type FrontendPaths,
    type FrontendSpecificRoute,
} from '@evir/common';
import {type IsEqual} from 'type-fest';
import {type createFrontendState} from './create-frontend-state.js';
import {type loadUser} from './load-user.js';

export function stateHasPath<const Paths extends FrontendPaths>(
    state: FullyResolvedFrontendState,
    paths: Paths,
): state is FullyResolvedFrontendState<Paths>;
export function stateHasPath<const Paths extends FrontendPaths>(
    state: PendingFrontendState,
    paths: Paths,
): state is PendingFrontendState<Paths>;
export function stateHasPath<const Paths extends FrontendPaths>(
    state: FullyResolvedFrontendState | PendingFrontendState,
    paths: Paths,
): state is FullyResolvedFrontendState<Paths> | PendingFrontendState<Paths> {
    return matchesPath(state.currentRoute, paths);
}

type FrontendStateInit = ReturnType<typeof createFrontendState>;

export type PendingFrontendState<SpecificPaths extends FrontendFullRoute['paths'] | void = void> =
    Overwrite<
        FrontendStateInit,
        {
            currentRoute: void extends SpecificPaths
                ? FrontendFullRoute
                : FrontendSpecificRoute<Exclude<SpecificPaths, void>>;
        }
    >;

export type FullyResolvedFrontendState<
    SpecificPaths extends FrontendFullRoute['paths'] | void = void,
    RequiresUser extends boolean | undefined = undefined,
> = Overwrite<
    FrontendStateInit,
    {
        api: BackendApi;
        user: IsEqual<RequiresUser, undefined> extends true
            ? Awaited<ReturnType<typeof loadUser>>
            : IsEqual<RequiresUser, false> extends true
              ? undefined
              : NonNullable<Awaited<ReturnType<typeof loadUser>>>;
        currentRoute: void extends SpecificPaths
            ? FrontendFullRoute
            : FrontendSpecificRoute<Exclude<SpecificPaths, void>>;
    }
>;

export type FrontendResolution<SpecificPaths extends FrontendFullRoute['paths'] | void = void> =
    | {
          pending: true;
          error?: undefined;
          resolvedNoUser?: undefined;
          resolvedWithUser?: undefined;
      }
    | {
          pending?: false | undefined;
          error: Error;
          resolvedNoUser?: undefined;
          resolvedWithUser?: undefined;
      }
    | {
          pending?: false | undefined;
          error?: undefined;
          resolved: FullyResolvedFrontendState<SpecificPaths>;
          resolvedNoUser: FullyResolvedFrontendState<SpecificPaths, false>;
          resolvedWithUser?: undefined;
      }
    | {
          pending?: false | undefined;
          error?: undefined;
          resolvedNoUser?: undefined;
          resolved: FullyResolvedFrontendState<SpecificPaths>;
          resolvedWithUser: FullyResolvedFrontendState<SpecificPaths, true>;
      };

export function getFrontendResolutionState<PendingState extends PendingFrontendState>(
    state: Readonly<PendingState>,
): FrontendResolution<PendingState['currentRoute']['paths']> {
    const pendingState = state as PendingFrontendState as PendingFrontendState<
        PendingState['currentRoute']['paths']
    >;

    if (!pendingState.user.isSettled() || !pendingState.api.settledValue) {
        return {
            pending: true,
        };
    } else if (pendingState.api.settledValue instanceof Error) {
        return {
            error: pendingState.api.settledValue,
        };
    } else if (pendingState.user.settledValue instanceof Error) {
        return {
            error: pendingState.user.settledValue,
        };
    }

    if (pendingState.user.settledValue) {
        const resolvedWithUser = {
            ...pendingState,
            api: pendingState.api.settledValue,
            user: pendingState.user.settledValue,
        };
        return {
            resolved: resolvedWithUser,
            resolvedWithUser,
        };
    } else {
        const resolvedNoUser = {
            ...pendingState,
            api: pendingState.api.settledValue,
            user: pendingState.user.settledValue,
        };
        return {
            resolved: resolvedNoUser,
            resolvedNoUser,
        };
    }
}
