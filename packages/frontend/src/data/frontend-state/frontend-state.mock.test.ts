import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {defaultFrontendRoute, frontendPathTree, type UserResponse} from '@evir/common';
import {mockUserResponse} from '@evir/common/src/data/user-response.mock.js';
import {type AsyncValue} from 'element-vir';
import {type FrontendState} from './frontend-state.js';
import {createMockFrontendState} from './frontend-state.mock.js';

describe(createMockFrontendState.name, () => {
    it('mocks no user by default', async (testContext) => {
        const mockFrontendState = await createMockFrontendState({
            test: testContext,
        });

        assert.tsType(mockFrontendState).equals<FrontendState<void, false>>();
    });
    it('mocks user', async (testContext) => {
        const mockFrontendState = await createMockFrontendState({
            test: testContext,
            mockUser: mockUserResponse,
        });

        assert.tsType(mockFrontendState).equals<FrontendState<void, true>>();
    });
    it('mocks route', async (testContext) => {
        const mockFrontendState = await createMockFrontendState({
            test: testContext,
            mockRoute: {
                ...defaultFrontendRoute,
                paths: frontendPathTree.paths.children.design.fullPaths,
            },
        });

        assert
            .tsType(mockFrontendState)
            .equals<
                FrontendState<typeof frontendPathTree.paths.children.design.fullPaths, false>
            >();
    });
    it('mocks route with user', async (testContext) => {
        const mockFrontendState = await createMockFrontendState({
            test: testContext,
            mockUser: mockUserResponse,
        });

        assert.tsType(mockFrontendState).equals<FrontendState<void, true>>();
    });
});

describe('FrontendStateObservable', () => {
    it('requires a user', async (testContext) => {
        const mockFrontendState = await createMockFrontendState({
            test: testContext,
        });

        const noUser: FrontendState = mockFrontendState;
        assert.tsType(noUser.user).equals<AsyncValue<Readonly<UserResponse> | undefined>>();
        // @ts-expect-error: generic frontend state cannot be assigned to one requiring a user
        const requiresUser: FrontendState<void, true> = mockFrontendState;
        assert.tsType(requiresUser.user).equals<Readonly<UserResponse>>();
    });
});
