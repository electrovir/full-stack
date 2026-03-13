import {combineErrorMessages, type PartialWithUndefined} from '@augment-vir/common';
import {type FrontendRoute, type UserResponse} from '@evir/common';
import {
    asyncProp,
    html,
    nothing,
    type AsyncProp,
    type AsyncValue,
    type HtmlInterpolation,
} from 'element-vir';
import {type IsEqual} from 'type-fest';
import {ViraError} from 'vira';
import {AppLoader} from '../../ui/elements/common/app-loader.element.js';
import {createMockApiClient, type MockApiFetch} from './frontend-clients/api.client.mock.js';
import {
    createFrontendState,
    type FrontendState,
    type FrontendStateTestParams,
} from './frontend-state.js';

export type MockFrontendStateParams<
    MockRoute extends Readonly<FrontendRoute> | undefined,
    MockUser extends AsyncValue<Readonly<UserResponse> | undefined> | void,
> = FrontendStateTestParams<MockUser> &
    PartialWithUndefined<{
        mockFetch: MockApiFetch;
        mockRoute: Readonly<MockRoute>;
    }>;

export type MockFrontendState<
    MockRoute extends Readonly<FrontendRoute> | undefined,
    MockUser extends AsyncValue<Readonly<UserResponse> | undefined> | void,
> = FrontendState<
    IsEqual<Extract<MockRoute, undefined>, undefined> extends true
        ? void
        : Exclude<MockRoute, undefined>['paths'],
    IsEqual<MockUser, void> extends true
        ? false
        : IsEqual<MockUser, undefined> extends true
          ? false
          : MockUser extends Promise<any>
            ? void
            : MockUser extends Error
              ? false
              : true
>;

export async function createMockFrontendState<
    const MockRoute extends Readonly<FrontendRoute> | undefined,
    const MockUser extends AsyncValue<Readonly<UserResponse> | undefined> | void = void,
>(
    params: Readonly<MockFrontendStateParams<MockRoute, MockUser>>,
): Promise<MockFrontendState<MockRoute, MockUser>> {
    const {mockFetch, mockRoute} = params;
    const frontendStateObservable = await createFrontendState(
        {
            test: params,
        },
        ({frontendEnvClient}) => {
            return {
                apiClient: createMockApiClient({
                    frontendEnvClient,
                    mockFetch,
                }),
            };
        },
    );

    if (mockRoute) {
        frontendStateObservable.value.router.setRoute(mockRoute);
    }

    return frontendStateObservable.value satisfies FrontendState as MockFrontendState<
        MockRoute,
        MockUser
    >;
}

export function createMockFrontendStateElementState<
    Paths extends ReadonlyArray<string> | void = void,
    HasUser extends boolean | void = void,
>() {
    return {
        frontendState: asyncProp<FrontendState<Paths, HasUser> | undefined, never>({
            defaultValue: undefined,
        }),
    };
}

export function renderWithMockFrontendState<
    const MockRoute extends Readonly<FrontendRoute> | undefined,
    const MockUser extends AsyncValue<Readonly<UserResponse> | undefined> | void = void,
>(
    mockParams: Readonly<MockFrontendStateParams<MockRoute, MockUser>>,
    elementState: Readonly<{
        frontendState: AsyncProp<MockFrontendState<MockRoute, MockUser> | undefined, never>;
    }>,
    render: (
        params: Readonly<{frontendState: MockFrontendState<MockRoute, MockUser>}>,
    ) => HtmlInterpolation,
) {
    if (elementState.frontendState.value instanceof Promise) {
        return html`
            <${AppLoader}></${AppLoader}>
        `;
    } else if (elementState.frontendState.value instanceof Error) {
        return html`
            <${ViraError}>
                ${combineErrorMessages(
                    'Failed to create mock state.',
                    elementState.frontendState.value,
                )}
            </${ViraError}>
        `;
    } else if (elementState.frontendState.value) {
        return render({
            frontendState: elementState.frontendState.value,
        });
    } else {
        elementState.frontendState.setValue(createMockFrontendState(mockParams));

        return nothing;
    }
}
