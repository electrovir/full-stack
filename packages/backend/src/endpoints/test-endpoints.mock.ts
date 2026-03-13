import {assert, assertWrap, check} from '@augment-vir/assert';
import {
    awaitedBlockingMap,
    ensureArray,
    getObjectTypedKeys,
    mergeDeep,
    omitObjectKeys,
    selectFrom,
    type AnyObject,
    type ArrayElement,
    type HttpStatus,
    type MaybeArray,
    type MaybePromise,
    type PartialWithUndefined,
    type SelectFrom,
    type SelectionSet,
} from '@augment-vir/common';
import {describe, itCasesWithContext, type UniversalTestContext} from '@augment-vir/test';
import {
    createFrontendUrl,
    csrfHeaderName,
    DeployEnv,
    type BackendEndpoint,
    type BackendEndpointPath,
    type BackendService,
} from '@evir/common';
import {type BackendClientInterface} from '@evir/common-backend';
import {createMockBackendClientInterface} from '@evir/common-backend/src/backend-client-interface/backend-client-interface.mock.js';
import {
    getDatabaseDiff,
    type DatabaseDiff,
} from '@evir/common-backend/src/data/database-diff-test.mock.js';
import {mergeDatabaseInits, type DatabaseInit} from '@evir/common/src/data/database-init.mock.js';
import {
    headersToObject,
    mergeHeaders,
    type FetchEndpointParams,
    type GenericFetchEndpointParams,
} from '@rest-vir/define-service';
import {condenseResponse, testEndpoint} from '@rest-vir/run-service';
import {type OutgoingHttpHeaders} from 'node:http';
import {type IsEqual, type RequireExactlyOne} from 'type-fest';
import {
    implementBackend,
    type BackendServiceImplementation,
} from '../backend-service-implementation.js';

export type IndividualEndpointToTestInputs<Path extends BackendEndpointPath> = FetchEndpointParams<
    BackendServiceImplementation['endpoints'][Path]
> &
    PartialWithUndefined<{
        databaseInit: DatabaseInit;
        authenticatedUserEmail: string;
        /**
         * A query to run after the endpoint executes. The result will be included in the test
         * output as `queryResult`.
         */
        after(backendClientInterface: Readonly<BackendClientInterface>): MaybePromise<unknown>;
    }>;

export type IndividualEndpointToTestCallback<Path extends BackendEndpointPath> = (params: {
    backendClientInterface: Readonly<BackendClientInterface>;
}) => MaybePromise<IndividualEndpointToTestInputs<Path>>;

export type TestEndpointsResult = Readonly<{
    dbDiff?: DatabaseDiff;
    /** The result of the `after` callback, if any. */
    afterResult?: unknown;
    responses: ReadonlyArray<
        Readonly<{
            status: HttpStatus;
            body?: unknown;
        }>
    >;
}>;

export type DescribeEndpointParams<Endpoint extends Readonly<BackendEndpoint>> = {
    endpointCases: EndpointCasesWithPrefilledEndpoint<NoInfer<Endpoint>>;
};

export function describeEndpoint<const Endpoint extends Readonly<BackendEndpoint>>(
    endpoint: Readonly<Endpoint>,
    callback: (params: Readonly<DescribeEndpointParams<Endpoint>>) => void | undefined,
) {
    const params: Readonly<DescribeEndpointParams<Endpoint>> = {
        endpointCases(suiteParams, testCases) {
            endpointCases<Endpoint, any>(
                {
                    ...suiteParams,
                    endpoint,
                },
                testCases,
            );
        },
    };

    describe(endpoint.path, () => {
        callback(params);
    });
}

export type EndpointCasesWithPrefilledEndpoint<Endpoint extends Readonly<BackendEndpoint>> = <
    const ResponseSelection extends
        | Readonly<SelectionSet<Extract<Endpoint['ResponseType'], AnyObject>>>
        | undefined = undefined,
>(
    {
        responseSelect,
        databaseInit,
        after,
    }: Readonly<{
        responseSelect?: Readonly<ResponseSelection>;
        databaseInit?: Readonly<DatabaseInit> | undefined;
        /**
         * A query to run after each endpoint executes. Individual test cases can override this with
         * their own `after`.
         */
        after?: (backendClientInterface: Readonly<BackendClientInterface>) => MaybePromise<unknown>;
    }>,
    testCases: ReadonlyArray<
        Readonly<{
            it: string;
            only?: boolean;
            skip?: boolean;
            input:
                | IndividualEndpointToTestInputs<NoInfer<Endpoint['path']>>
                | IndividualEndpointToTestCallback<NoInfer<Endpoint['path']>>;
            expect: IndividualTestEndpointResult<
                NoInfer<Endpoint['path']>,
                NoInfer<ResponseSelection>
            >;
        }>
    >,
) => void;

function endpointCases<
    const Endpoint extends BackendEndpoint,
    const ResponseSelection extends
        | Readonly<SelectionSet<Extract<Endpoint['ResponseType'], AnyObject>>>
        | undefined = undefined,
>(
    {
        endpoint,
        responseSelect,
        databaseInit,
        after: suiteAfter,
    }: Readonly<{
        endpoint: Endpoint;
        responseSelect?: Readonly<ResponseSelection>;
        databaseInit?: Readonly<DatabaseInit> | undefined;
        after?: (backendClientInterface: Readonly<BackendClientInterface>) => MaybePromise<unknown>;
    }>,
    testCases: ReadonlyArray<
        Readonly<{
            it: string;
            only?: boolean;
            skip?: boolean;
            input:
                | IndividualEndpointToTestInputs<NoInfer<Endpoint['path']>>
                | IndividualEndpointToTestCallback<NoInfer<Endpoint['path']>>;
            expect: IndividualTestEndpointResult<
                NoInfer<Endpoint['path']>,
                NoInfer<ResponseSelection>
            >;
        }>
    >,
) {
    return itCasesWithContext(
        createEndpointTester<Endpoint['path'], ResponseSelection>(
            endpoint.path,
            responseSelect,
            databaseInit,
            suiteAfter,
        ),
        testCases as any[],
    );
}

export type IndividualTestEndpointResult<
    Path extends BackendEndpointPath,
    ResponseSelection extends
        | Readonly<
              SelectionSet<Extract<BackendService['endpoints'][Path]['ResponseType'], AnyObject>>
          >
        | undefined = undefined,
> = {
    dataDiff?: TestEndpointsResult['dbDiff'];
    /** The result of the postQuery callback, if provided. */
    afterResult?: unknown;
    response: Readonly<{
        status: HttpStatus;
        headers?: OutgoingHttpHeaders;
        body?:
            | string
            | undefined
            | (IsEqual<ResponseSelection, undefined> extends true
                  ? BackendService['endpoints'][Path]['ResponseType']
                  : SelectFrom<
                        Extract<BackendService['endpoints'][Path]['ResponseType'], AnyObject>,
                        Extract<
                            ResponseSelection,
                            SelectionSet<
                                Extract<
                                    BackendService['endpoints'][Path]['ResponseType'],
                                    AnyObject
                                >
                            >
                        >
                    >);
    }>;
};

function createEndpointTester<
    const Path extends BackendEndpointPath,
    const ResponseSelection extends
        | Readonly<
              SelectionSet<Extract<BackendService['endpoints'][Path]['ResponseType'], AnyObject>>
          >
        | undefined,
>(
    endpointPath: Path,
    responseSelect: Readonly<ResponseSelection> | undefined,
    suiteDatabaseInit: Readonly<DatabaseInit> | undefined,
    suiteAfter:
        | ((backendClientInterface: Readonly<BackendClientInterface>) => MaybePromise<unknown>)
        | undefined,
) {
    return async (
        testContext: Readonly<UniversalTestContext>,
        testCaseInputs:
            | IndividualEndpointToTestInputs<NoInfer<Path>>
            | IndividualEndpointToTestCallback<NoInfer<Path>>,
    ): Promise<IndividualTestEndpointResult<Path, ResponseSelection>> => {
        const backendClientInterface = await createMockBackendClientInterface(testContext);

        const params = check.isFunction(testCaseInputs)
            ? await testCaseInputs({
                  backendClientInterface,
              })
            : testCaseInputs;

        const result = await testEndpoints(
            backendClientInterface,
            {
                [endpointPath]: params,
            } as any,
            mergeDatabaseInits(suiteDatabaseInit, params.databaseInit),
            params.authenticatedUserEmail,
            params.after || suiteAfter,
        );

        const response = assertWrap.isLengthExactly(result.responses, 1)[0];
        const body =
            check.isObject(response.body) && responseSelect
                ? selectFrom(response.body, responseSelect as AnyObject)
                : response.body;

        return {
            ...(result.dbDiff
                ? {
                      dataDiff: result.dbDiff,
                  }
                : {}),
            ...(result.afterResult === undefined
                ? {}
                : {
                      afterResult: result.afterResult,
                  }),
            response: {
                ...response,
                ...(body
                    ? {
                          body,
                      }
                    : {}),
            } as any,
        };
    };
}

type EndpointsToTest = {
    [Path in BackendEndpointPath]: FetchEndpointParams<
        BackendServiceImplementation['endpoints'][Path]
    >;
};

async function testEndpoints(
    backendClientInterface: Readonly<BackendClientInterface>,
    endpoints: MaybeArray<RequireExactlyOne<EndpointsToTest>>,
    databaseInit: DatabaseInit = {},
    authenticatedUserEmail?: string | undefined,
    after?:
        | ((backendClientInterface: Readonly<BackendClientInterface>) => MaybePromise<unknown>)
        | undefined,
): Promise<TestEndpointsResult> {
    try {
        const serviceImplementation = implementBackend(backendClientInterface);

        const {dbDiff, output: responses} = await getDatabaseDiff<TestEndpointsResult['responses']>(
            backendClientInterface,
            databaseInit,
            async () => {
                return await awaitedBlockingMap(
                    ensureArray(endpoints),
                    async (
                        endpointEntry,
                        entryIndex,
                    ): Promise<ArrayElement<TestEndpointsResult['responses']>> => {
                        const endpointPaths = getObjectTypedKeys(endpointEntry);

                        if (!check.isLengthExactly(endpointPaths, 1)) {
                            throw new Error(
                                `Cannot run tests on multiple endpoints at once: got '${endpointPaths.join(',')}' at index '${entryIndex}'`,
                            );
                        }
                        const endpointPath = endpointPaths[0];
                        const params = endpointEntry[endpointPath] as
                            | GenericFetchEndpointParams
                            | undefined;
                        assert.isDefined(
                            params,
                            `No test value found for '${endpointPath}' at index '${entryIndex}'`,
                        );

                        const endpointToTest = serviceImplementation.endpoints[endpointPath];

                        const inputHeaders = headersToObject(params.options?.headers || []);
                        const requestOrigin =
                            inputHeaders.origin?.[0] ||
                            createFrontendUrl(
                                DeployEnv.Dev,
                                backendClientInterface.backendEnvClient.universalConfig,
                            ).origin;

                        const authenticatedUser = authenticatedUserEmail
                            ? await backendClientInterface.prismaClient.user.findFirst({
                                  where: {
                                      emailAddress: authenticatedUserEmail,
                                      deactivatedAt: null,
                                  },
                                  select: {
                                      id: true,
                                  },
                              })
                            : undefined;

                        if (authenticatedUserEmail && !authenticatedUser) {
                            throw new Error(
                                `Failed to find test user by email address '${authenticatedUserEmail}'.`,
                            );
                        }

                        const authHeaders = authenticatedUser
                            ? await backendClientInterface.backendAuthClient.createLoginHeaders({
                                  isSignUpCookie: false,
                                  requestHeaders: {},
                                  userId: authenticatedUser.id,
                              })
                            : undefined;

                        const headers = mergeHeaders(
                            {
                                cookie: authHeaders?.['set-cookie'],
                                [csrfHeaderName]: authHeaders?.[csrfHeaderName],
                            },
                            params.options?.headers || [],
                            {
                                origin: requestOrigin,
                            },
                        );

                        const response = await testEndpoint<any>(
                            endpointToTest,
                            mergeDeep(params, {
                                options: {
                                    headers,
                                },
                            } satisfies GenericFetchEndpointParams as GenericFetchEndpointParams),
                        );

                        const condensed = await condenseResponse(response);

                        const body = condensed.body
                            ? response.headers.get('content-type')?.includes('application/json')
                                ? JSON.parse(condensed.body)
                                : condensed.body
                            : undefined;

                        const responseHeaders = omitObjectKeys(condensed.headers, [
                            'access-control-allow-origin',
                            'access-control-expose-headers',
                            'content-type',
                            'access-control-allow-credentials',
                            'vary',
                            csrfHeaderName,
                            'set-cookie',
                        ]);

                        return {
                            ...(body === undefined
                                ? {}
                                : {
                                      body,
                                  }),
                            status: condensed.status,
                            ...(Object.keys(responseHeaders).length
                                ? {
                                      headers: responseHeaders,
                                  }
                                : {}),
                        };
                    },
                );
            },
        );

        const afterResult = after ? await after(backendClientInterface) : undefined;

        const result: TestEndpointsResult = {
            responses: responses || [],
            ...(dbDiff
                ? {
                      dbDiff,
                  }
                : {}),
            ...(afterResult === undefined
                ? {}
                : {
                      afterResult,
                  }),
        };

        return result;
    } finally {
        await backendClientInterface.destroy();
    }
}
