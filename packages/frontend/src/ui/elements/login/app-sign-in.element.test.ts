import {check, waitUntil} from '@augment-vir/assert';
import {
    awaitAllPromisesInObject,
    HttpStatus,
    omitObjectKeys,
    type ErrorHttpStatus,
} from '@augment-vir/common';
import {describe, testWeb, type UniversalTestContext} from '@augment-vir/test';
import {queryThroughShadow} from '@augment-vir/web';
import {csrfHeaderName, type BackendService} from '@evir/common';
import {mockUserResponse} from '@evir/common/src/data/user-response.mock.js';
import {createMockResponse} from '@rest-vir/define-service';
import {type CsrfToken} from 'auth-vir';
import {calculateRelativeDate, getNowInUtcTimezone} from 'date-vir';
import {testIdSelector} from 'element-vir';
import {createMockFrontendState} from '../../../data/frontend-state/frontend-state.mock.js';
import englishPhrases from '../../../data/translations/en.js';
import {UserEditEvent} from '../../events/user-edit.event.js';
import {AppCredentials} from './app-credentials.element.js';
import {AppSignIn} from './app-sign-in.element.js';

describe(AppSignIn.tagName, () => {
    async function createAppSignInInputs(
        testContext: Readonly<UniversalTestContext>,
        response?:
            | ErrorHttpStatus
            | {
                  body: BackendService['endpoints']['/login']['ResponseType'];
                  headers?: HeadersInit | undefined;
              }
            | Error
            | undefined,
    ): Promise<(typeof AppSignIn)['InputsType']> {
        return {
            frontendState: await createMockFrontendState({
                test: testContext,
                mockFetch() {
                    if (response instanceof Error) {
                        throw response;
                    }

                    const status = check.isObject(response) || !response ? HttpStatus.Ok : response;
                    const body = check.isObject(response) ? response.body : undefined;
                    const headers = check.isObject(response) ? response.headers : undefined;

                    return createMockResponse({
                        status,
                        body,
                        headers,
                    });
                },
            }),

            wipeUrlAfterLogin: false,
        };
    }

    async function getElements(instance: (typeof AppSignIn)['InstanceType']) {
        return await awaitAllPromisesInObject({
            emailInput: waitUntil.instanceOf(HTMLElement, () =>
                queryThroughShadow(instance, testIdSelector(AppCredentials.testIds.emailInput)),
            ),
            passwordInput: waitUntil.instanceOf(HTMLElement, () =>
                queryThroughShadow(instance, testIdSelector(AppCredentials.testIds.passwordInput)),
            ),
            submitButton: waitUntil.instanceOf(HTMLElement, () =>
                queryThroughShadow(instance, testIdSelector(AppCredentials.testIds.submitButton)),
            ),
        });
    }

    async function submitMockSignIn(instance: (typeof AppSignIn)['InstanceType']) {
        const {emailInput, passwordInput, submitButton} = await getElements(instance);

        await testWeb.typeIntoElement('test@example.com', emailInput);
        await testWeb.typeIntoElement('my password', passwordInput);
        await testWeb.click(submitButton);
    }

    testWeb.elementCases(AppSignIn, [
        {
            it: 'has correct initial state',
            createInputs: createAppSignInInputs,
            expect: {
                text: [
                    'Please sign in',
                    'Forgot your password?',
                ],
            },
        },
        {
            it: 'handles account verification',
            createInputs(testContext) {
                return createAppSignInInputs(testContext, {
                    body: {
                        emailSent: true,
                    },
                });
            },
            async act(instance) {
                await submitMockSignIn(instance);
            },
            expect: {
                text: 'verify your email to continue',
            },
        },
        {
            it: 'handles network failure',
            createInputs(testContext) {
                return createAppSignInInputs(testContext, new Error('Network failure'));
            },
            async act(instance) {
                await submitMockSignIn(instance);
            },
            expect: {
                text: 'Failed to sign in: Network failure',
            },
        },
        {
            it: 'handles password failure',
            createInputs(testContext) {
                return createAppSignInInputs(testContext, HttpStatus.Unauthorized);
            },
            async act(instance) {
                await submitMockSignIn(instance);
            },
            expect: {
                text: englishPhrases.AppSignIn.credentialsMismatch,
            },
        },
        {
            it: 'handles successful login',
            createInputs(testContext) {
                return createAppSignInInputs(testContext, {
                    body: mockUserResponse,
                    headers: {
                        [csrfHeaderName]: JSON.stringify({
                            expiration: calculateRelativeDate(getNowInUtcTimezone(), {
                                days: 2,
                            }),
                            token: 'token here',
                        } satisfies CsrfToken),
                    },
                });
            },
            async act(instance) {
                await submitMockSignIn(instance);
            },
            expect: {
                events: new Map([
                    [
                        UserEditEvent,
                        [
                            omitObjectKeys(mockUserResponse, [
                                'isAssumed',
                                'isInternalAdmin',
                            ]),
                        ],
                    ],
                ]),
            },
        },
    ]);
});
