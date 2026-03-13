import {type FullSpaRoute, type SpaRouteByPath} from 'spa-router-vir';
import {type EmailCodeType} from '../../database-exports-for-common.js';
import {frontendPathTree} from './frontend-path-tree.js';

export type FrontendPaths = Readonly<typeof frontendPathTree.PathsType>;
export type FrontendRoute<Paths extends ReadonlyArray<string> | void = void> =
    Paths extends FrontendPaths
        ? SpaRouteByPath<Paths, Readonly<FullSpaRoute<FrontendPaths, FrontendSearchParams>>>
        : Readonly<FullSpaRoute<FrontendPaths, FrontendSearchParams>>;

export const testNameSearchParamKey = 'testName';

export type FrontendSearchParams =
    | Partial<{
          /** Used to verify our email codes. */
          code: Readonly<[string]>;
          /** Used for email code verification. */
          id: Readonly<[string]>;
          /** Used for email code verification. */
          type: Readonly<[EmailCodeType]>;
          /** Used in tests, we want to make sure we don't clear it otherwise tests won't work. */
          'wtr-session-id': Readonly<[string]>;

          lang: Readonly<[string]>;

          [testNameSearchParamKey]: Readonly<[string]>;
      }>
    | undefined;

export type FrontendSearchParamKey = keyof NonNullable<Required<FrontendSearchParams>>;

export const defaultFrontendRoute: FrontendRoute = {
    paths: frontendPathTree.paths.fullPaths,
    hash: undefined,
    search: undefined,
};
