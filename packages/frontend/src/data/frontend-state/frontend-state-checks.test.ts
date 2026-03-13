import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {frontendPathTree, type FrontendRoute, type UserResponse} from '@evir/common';
import {type AsyncValue} from 'element-vir';
import {stateMatches} from './frontend-state-checks.js';
import {type FrontendState} from './frontend-state.js';
import {createMockFrontendState} from './frontend-state.mock.js';

describe(stateMatches.name, () => {
    it('does nothing when not used', async (testContext) => {
        const frontendState = (await createMockFrontendState({
            test: testContext,
        })) as FrontendState;

        assert.tsType(frontendState.user).equals<AsyncValue<Readonly<UserResponse> | undefined>>();
        assert.tsType(frontendState.user).notEquals<undefined>();
        assert.tsType(frontendState.user).notEquals<Readonly<UserResponse>>();
        assert.tsType(frontendState.currentRoute).equals<FrontendRoute>();
        assert
            .tsType(frontendState.currentRoute)
            .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.PathsType>>();
        assert
            .tsType(frontendState.currentRoute)
            .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.fullPaths>>();
    });

    it('requires user', async (testContext) => {
        const frontendState = (await createMockFrontendState({
            test: testContext,
        })) as FrontendState;

        if (
            stateMatches(frontendState, {
                hasUser: true,
            })
        ) {
            assert
                .tsType(frontendState.user)
                .notEquals<AsyncValue<Readonly<UserResponse> | undefined>>();
            assert.tsType(frontendState.user).notEquals<undefined>();
            assert.tsType(frontendState.user).equals<Readonly<UserResponse>>();
            assert.tsType(frontendState.currentRoute).equals<FrontendRoute>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.PathsType>>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.fullPaths>>();
        }

        assert.isFalse(
            stateMatches(frontendState, {
                hasUser: true,
            }),
        );
    });

    it('blocks user', async (testContext) => {
        const frontendState = (await createMockFrontendState({
            test: testContext,
        })) as FrontendState;

        if (
            stateMatches(frontendState, {
                hasUser: false,
            })
        ) {
            assert
                .tsType(frontendState.user)
                .notEquals<AsyncValue<Readonly<UserResponse> | undefined>>();
            assert.tsType(frontendState.user).equals<undefined>();
            assert.tsType(frontendState.user).notEquals<Readonly<UserResponse>>();
            assert.tsType(frontendState.currentRoute).equals<FrontendRoute>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.PathsType>>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.fullPaths>>();
        }
    });

    it('requires path', async (testContext) => {
        const frontendState = (await createMockFrontendState({
            test: testContext,
        })) as FrontendState;

        if (
            stateMatches(frontendState, {
                paths: frontendPathTree.paths.children.link,
            })
        ) {
            assert
                .tsType(frontendState.user)
                .equals<AsyncValue<Readonly<UserResponse> | undefined>>();
            assert.tsType(frontendState.user).notEquals<undefined>();
            assert.tsType(frontendState.user).notEquals<Readonly<UserResponse>>();
            assert.tsType(frontendState.currentRoute).notEquals<FrontendRoute>();
            assert
                .tsType(frontendState.currentRoute)
                .equals<FrontendRoute<typeof frontendPathTree.paths.children.link.PathsType>>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.fullPaths>>();
        }
    });

    it('requires path and user', async (testContext) => {
        const frontendState = (await createMockFrontendState({
            test: testContext,
        })) as FrontendState;

        if (
            stateMatches(frontendState, {
                paths: frontendPathTree.paths.children.link,
                hasUser: true,
            })
        ) {
            assert
                .tsType(frontendState.user)
                .notEquals<AsyncValue<Readonly<UserResponse> | undefined>>();
            assert.tsType(frontendState.user).notEquals<undefined>();
            assert.tsType(frontendState.user).equals<Readonly<UserResponse>>();
            assert.tsType(frontendState.currentRoute).notEquals<FrontendRoute>();
            assert
                .tsType(frontendState.currentRoute)
                .equals<FrontendRoute<typeof frontendPathTree.paths.children.link.PathsType>>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.fullPaths>>();
        }
    });

    it('requires path and blockers user', async (testContext) => {
        const frontendState = (await createMockFrontendState({
            test: testContext,
        })) as FrontendState;
        if (
            stateMatches(frontendState, {
                paths: frontendPathTree.paths.children.link,
                hasUser: false,
            })
        ) {
            assert
                .tsType(frontendState.user)
                .notEquals<AsyncValue<Readonly<UserResponse> | undefined>>();
            assert.tsType(frontendState.user).equals<undefined>();
            assert.tsType(frontendState.user).notEquals<Readonly<UserResponse>>();
            assert.tsType(frontendState.currentRoute).notEquals<FrontendRoute>();
            assert
                .tsType(frontendState.currentRoute)
                .equals<FrontendRoute<typeof frontendPathTree.paths.children.link.PathsType>>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.fullPaths>>();
        }
    });

    it('requires exact path', async (testContext) => {
        const frontendState = (await createMockFrontendState({
            test: testContext,
        })) as FrontendState;

        if (
            stateMatches(frontendState, {
                paths: frontendPathTree.paths.children.link,
                options: {
                    exactMatch: true,
                },
            })
        ) {
            assert
                .tsType(frontendState.user)
                .equals<AsyncValue<Readonly<UserResponse> | undefined>>();
            assert.tsType(frontendState.user).notEquals<undefined>();
            assert.tsType(frontendState.user).notEquals<Readonly<UserResponse>>();
            assert.tsType(frontendState.currentRoute).notEquals<FrontendRoute>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.PathsType>>();
            assert
                .tsType(frontendState.currentRoute)
                .equals<FrontendRoute<typeof frontendPathTree.paths.children.link.fullPaths>>();
        }
    });

    it('requires exact path and user', async (testContext) => {
        const frontendState = (await createMockFrontendState({
            test: testContext,
        })) as FrontendState;

        if (
            stateMatches(frontendState, {
                paths: frontendPathTree.paths.children.link,
                options: {
                    exactMatch: true,
                },
                hasUser: true,
            })
        ) {
            assert
                .tsType(frontendState.user)
                .notEquals<AsyncValue<Readonly<UserResponse> | undefined>>();
            assert.tsType(frontendState.user).notEquals<undefined>();
            assert.tsType(frontendState.user).equals<Readonly<UserResponse>>();
            assert.tsType(frontendState.currentRoute).notEquals<FrontendRoute>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.PathsType>>();
            assert
                .tsType(frontendState.currentRoute)
                .equals<FrontendRoute<typeof frontendPathTree.paths.children.link.fullPaths>>();
        }
    });

    it('requires exact path and blockers user', async (testContext) => {
        const frontendState = (await createMockFrontendState({
            test: testContext,
        })) as FrontendState;
        if (
            stateMatches(frontendState, {
                paths: frontendPathTree.paths.children.link,
                options: {
                    exactMatch: true,
                },
                hasUser: false,
            })
        ) {
            assert
                .tsType(frontendState.user)
                .notEquals<AsyncValue<Readonly<UserResponse> | undefined>>();
            assert.tsType(frontendState.user).equals<undefined>();
            assert.tsType(frontendState.user).notEquals<Readonly<UserResponse>>();
            assert.tsType(frontendState.currentRoute).notEquals<FrontendRoute>();
            assert
                .tsType(frontendState.currentRoute)
                .notEquals<FrontendRoute<typeof frontendPathTree.paths.children.link.PathsType>>();
            assert
                .tsType(frontendState.currentRoute)
                .equals<FrontendRoute<typeof frontendPathTree.paths.children.link.fullPaths>>();
        }
    });
});
