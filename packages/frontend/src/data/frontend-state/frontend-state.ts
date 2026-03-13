import {check} from '@augment-vir/assert';
import {
    type AnyObject,
    DeferredPromise,
    type Overwrite,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {type UniversalTestContext} from '@augment-vir/test';
import {
    type AssumedUser,
    type BackendApi,
    createRouteSanitizer,
    csrfOptions,
    defaultFrontendRoute,
    defaultRawUniversalConfig,
    DeployEnv,
    determineScreenSize,
    type FrontendRoute,
    ScreenSize,
    type UserResponse,
} from '@evir/common';
import {FrontendAuthClient} from 'auth-vir';
import {type AsyncValue, attachOnResize, Observable, resolvedAsyncValue} from 'element-vir';
import {SpaRouter} from 'spa-router-vir';
import {type IsEqual, type RequireExactlyOne} from 'type-fest';
import {type ApiClient, createApiClient} from './frontend-clients/api.client.js';
import {createAppI18nClient} from './frontend-clients/app-i18n.client.js';
import {
    createFrontendEnvClient,
    type FrontendEnvClient,
} from './frontend-clients/frontend-env.client.js';
import {createLocalStorageClient} from './frontend-clients/local-storage.client.js';
import {ThemeClient} from './frontend-clients/theme.client.js';
import {loadUser} from './load-user.js';

export type FrontendStateTestParams<
    MockUser extends AsyncValue<Readonly<UserResponse> | undefined> | void,
> = {
    test: UniversalTestContext | string;
} & PartialWithUndefined<{
    mockUser: MockUser;
}>;

export type FrontendStateParams = RequireExactlyOne<{
    test: Readonly<FrontendStateTestParams<any>>;
    hostElement: HTMLElement;
}>;

export async function createFrontendState(
    params: Readonly<FrontendStateParams>,
    createMockOverrides?: (
        params: Readonly<{
            frontendEnvClient: Readonly<FrontendEnvClient>;
        }>,
    ) => Partial<{
        apiClient: ApiClient;
    }>,
) {
    const frontendEnvClient = createFrontendEnvClient(defaultRawUniversalConfig, params.test?.test);

    const mockOverrides = createMockOverrides?.({
        frontendEnvClient,
    });

    const deferredApiClient = new DeferredPromise<BackendApi>();
    const localStorageClient = createLocalStorageClient();

    const router = new SpaRouter({
        sanitizeRoute: createRouteSanitizer(frontendEnvClient.deployEnv),
    });

    /**
     * Forward reference to break the circular init dependency: FrontendAuthClient callbacks need
     * state access, but the state observable includes FrontendAuthClient in its value.
     */
    const userStateRef = {
        getUser(): AsyncValue<Readonly<UserResponse> | undefined> | undefined {
            return undefined;
        },
        clearUser(): void {},
    };

    const frontendAuthClient = new FrontendAuthClient<AssumedUser>({
        async authClearedCallback() {
            const user = resolvedAsyncValue(userStateRef.getUser());

            if (!user) {
                return;
            }

            localStorageClient.delete.selectedTeamId();
            userStateRef.clearUser();
            router.setRoute({
                paths: [],
            });
            const apiClient = await deferredApiClient.promise;
            await apiClient.endpoints['/unauthorized'].fetch();
        },
        csrf: csrfOptions,
        canAssumeUser(): boolean {
            return !!resolvedAsyncValue(userStateRef.getUser())?.isInternalAdmin;
        },
        checkUser: {
            async performCheck() {
                if (!resolvedAsyncValue(userStateRef.getUser())) {
                    /** Don't check the user when there is no user. */
                    return;
                }

                return (await (await deferredApiClient.promise).endpoints['/user'].fetch())
                    .response;
            },
        },
    });

    const apiClient =
        mockOverrides?.apiClient ||
        (await createApiClient({
            frontendAuthClient,
            frontendEnvClient,
            router,
            localStorageClient,
        }));
    deferredApiClient.resolve(apiClient);

    const windowTitle = [
        frontendEnvClient.universalConfig.companyProperName,
        frontendEnvClient.deployEnv === DeployEnv.Prod
            ? undefined
            : `(${frontendEnvClient.deployEnv})`,
    ]
        .filter(check.isTruthy)
        .join(' ');

    window.document.title = windowTitle;

    // initialize Sentry
    void import('sentry-vir/dist/browser.js').then(({initSentry}) =>
        initSentry({
            dsn: 'YOU SHOULD UPDATE THIS',
            isDev: frontendEnvClient.deployEnv === DeployEnv.Dev,
            releaseEnv: frontendEnvClient.deployEnv,
            releaseName: frontendEnvClient.release,
            sentryConfigOverrides: {
                sendDefaultPii: false,
            },
        }),
    );

    const initUser =
        params.test && 'mockUser' in params.test
            ? Promise.resolve(params.test.mockUser)
            : loadUser(deferredApiClient.promise);

    const themeClient = new ThemeClient({
        localStorageClient,
    });

    const rawFrontendStateObservable = new Observable({
        equalityCheck: check.strictEquals,
        defaultValue: {
            frontendAuthClient,
            themeClient,
            localStorageClient,
            screenSize: params.hostElement
                ? determineScreenSize({
                      currentScreenSize: undefined,
                      /**
                       * This returns a size different than what the resize observer will give us
                       * because the website has, at this point, not rendered yet so there are no
                       * scrollbars taking up any size.
                       */
                      elementWidth: params.hostElement.clientWidth,
                  })
                : ScreenSize.Desktop,
            i18nClient: await createAppI18nClient(),
            router,
            currentRoute: defaultFrontendRoute,
            debug: false,
            frontendEnvClient,
            apiClient,
            user: initUser satisfies AsyncValue<UserResponse | undefined> as AsyncValue<
                UserResponse | undefined
            >,
        },
    });

    function update(
        this: void,
        updateValue: Partial<(typeof rawFrontendStateObservable)['value']>,
    ) {
        rawFrontendStateObservable.setValue({
            ...rawFrontendStateObservable.value,
            ...updateValue,
        });
    }

    userStateRef.getUser = () => rawFrontendStateObservable.value.user;
    userStateRef.clearUser = () => {
        update({
            user: undefined,
        });
    };

    localStorageClient.listenToAllValues(() => {
        update({});
    });

    const unlistenRouter = router.listen(true, (newRoute) => {
        update({
            currentRoute: newRoute,
        });
    });
    const {resizeObserver} = params.hostElement
        ? attachOnResize(params.hostElement, ({contentRect}) => {
              const screenSize = determineScreenSize({
                  elementWidth: contentRect.width,
                  currentScreenSize: rawFrontendStateObservable.value.screenSize,
              });

              update({
                  screenSize,
              });
          })
        : {
              resizeObserver: undefined,
          };

    const frontendStateObservable = Object.assign(
        rawFrontendStateObservable as AnyObject as Omit<
            typeof rawFrontendStateObservable,
            /** Omit some properties to make the interface simpler. */
            | 'equalityCheck'
            | 'getListenerCount'
            // | 'listen'
            | 'listenToEvent'
            | 'removeAllListeners'
            | 'removeListener'
            | 'destroy'
            | 'setValue'
        >,
        {
            update,
            destroy() {
                unlistenRouter();
                rawFrontendStateObservable.destroy();
                resizeObserver?.disconnect();
            },
        },
    );

    void initUser.then((user) => {
        frontendStateObservable.update({
            user,
        });
    });

    return frontendStateObservable;
}

export type FrontendStateObservable = Awaited<ReturnType<typeof createFrontendState>>;

export type FrontendState<
    Paths extends ReadonlyArray<string> | void = void,
    HasUser extends boolean | void = void,
> = WithValidFrontendPath<
    Paths,
    Overwrite<
        FrontendStateObservable['value'],
        {
            user: IsEqual<HasUser, void> extends true
                ? AsyncValue<Readonly<UserResponse> | undefined>
                : IsEqual<HasUser, false> extends true
                  ? undefined
                  : Readonly<UserResponse>;
            currentRoute: FrontendRoute<Paths>;
        }
    >
>;

export type WithValidFrontendPath<
    Paths extends ReadonlyArray<string> | void,
    T,
> = void extends Paths ? T : Paths extends FrontendRoute['paths'] ? T : never;
