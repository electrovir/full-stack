import {assert} from '@augment-vir/assert';
import {HttpStatus, randomInteger, wait, type SetRequiredAndNotNull} from '@augment-vir/common';
import {
    CustomHeader,
    DeployEnv,
    EndpointAuth,
    getOffsetDateInIso,
    type BackendEndpoint,
} from '@evir/common';
import {type AuthenticatedUser, type BackendClientInterface} from '@evir/common-backend';
import {
    type ContextInit,
    type ServerRequest,
    type ServerResponse,
} from '@rest-vir/implement-service';
import {setResponseHeaders} from '@rest-vir/run-service';
import {negateDuration} from 'date-vir';
import {type IncomingHttpHeaders} from 'node:http';

export type BackendContext = BackendClientInterface & {
    authenticatedUser: AuthenticatedUser | undefined;
    /**
     * This is only populated when the user cannot be fully authorized with a CSRF token, only a
     * cookie.
     *
     * @deprecated: this should be used in very rare circumstances where the CSRF token cannot be provided to validate auth.
     */
    partiallyAuthenticatedUser: AuthenticatedUser | undefined;
    signUpAuthenticatedUser: AuthenticatedUser | undefined;
    frontendSource: undefined | string;
};

export function hasAuthenticatedUser(
    context: BackendContext,
): context is BackendContextWithAuthenticatedUser {
    return !!context.authenticatedUser;
}

export type BackendContextWithAuthenticatedUser = SetRequiredAndNotNull<
    BackendContext,
    'authenticatedUser'
>;

export async function createBackendContext(
    backendClientInterface: Readonly<BackendClientInterface>,
    requestHeaders: IncomingHttpHeaders,
    endpoint: Readonly<BackendEndpoint>,
    response: Readonly<ServerResponse>,
    request: Readonly<ServerRequest>,
): Promise<ReturnType<ContextInit<BackendContext, any, any, any>>> {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const {secureUser, insecureUser} =
        await backendClientInterface.backendAuthClient.getInsecureOrSecureUser({
            requestHeaders,
            isSignUpCookie: false,
            /** Refresh the user session only on the `/user` endpoint. */
            allowUserAuthRefresh:
                endpoint.path ===
                backendClientInterface.backendEnvClient.backendService.endpoints['/user'].path,
        });

    const signUpUser = (
        await backendClientInterface.backendAuthClient.getInsecureOrSecureUser({
            requestHeaders,
            isSignUpCookie: true,
            /** Don't bother refreshing a sign up cookie user. */
            allowUserAuthRefresh: false,
        })
    ).secureUser;

    const userResult = secureUser || insecureUser || signUpUser;

    if (userResult) {
        setResponseHeaders(response, userResult.responseHeaders);
    }

    /** Check rate limiting based on event log count for the current IP and/or user. */
    const clientIp = request.ip;
    const userId = secureUser?.user.id || insecureUser?.user.id;
    if (clientIp || userId) {
        const eventLogCount = await backendClientInterface.prismaClient.eventLog.count({
            where: {
                createdAt: {
                    gte: getOffsetDateInIso(
                        negateDuration(
                            backendClientInterface.backendEnvClient.backendConfig.eventLogMax
                                .duration,
                        ),
                    ),
                },
                OR: [
                    ...(clientIp
                        ? [
                              {
                                  clientIp,
                              },
                          ]
                        : []),
                    ...(userId
                        ? [
                              {
                                  userId,
                              },
                          ]
                        : []),
                ],
            },
        });

        if (
            eventLogCount >= backendClientInterface.backendEnvClient.backendConfig.eventLogMax.count
        ) {
            return {
                reject: {
                    statusCode: HttpStatus.TooManyRequests,
                },
            };
        }
    }

    if (
        !userResult &&
        backendClientInterface.backendEnvClient.deployEnv !== DeployEnv.Dev &&
        /**
         * Don't throttle the user endpoint because the frontend uses it to determine if it is
         * authenticated.
         */
        endpoint.path !== '/user'
    ) {
        /** Throttle unauthenticated requests. */
        await wait({
            milliseconds: randomInteger({
                min: 500,
                max: 1500,
            }),
        });
    }

    const authenticatedUser = secureUser?.user || signUpUser?.user;
    const partiallyAuthenticatedUser = insecureUser?.user;

    /** If this throws then an endpoint definition is missing custom props. */
    assert.tsType<Extract<typeof endpoint.customProps, undefined>>().equals<never>();

    const authRequirement = endpoint.customProps.requiredAuth;
    const context: BackendContext = {
        authenticatedUser,
        partiallyAuthenticatedUser,
        signUpAuthenticatedUser: signUpUser?.user,
        frontendSource: requestHeaders[CustomHeader.FrontendSource]?.[0],
        ...backendClientInterface,
    };

    if (authRequirement === EndpointAuth.Any) {
        return {
            context,
        };
    } else if (authRequirement === EndpointAuth.BlockAuthenticated) {
        if (authenticatedUser) {
            return {
                reject: {
                    statusCode: HttpStatus.BadRequest,
                },
            };
        } else {
            return {
                context,
            };
        }
    } else {
        const user =
            authRequirement === EndpointAuth.LoginAuthRequired
                ? authenticatedUser
                : authRequirement === EndpointAuth.PartialAuthAllowed
                  ? authenticatedUser || partiallyAuthenticatedUser
                  : authenticatedUser;

        if (user) {
            const failedAdminCheck =
                authRequirement === EndpointAuth.InternalAdminOnly && !user.isInternalAdmin;
            const isBlocked =
                !user.isUserApprovedByAdmin && authRequirement !== EndpointAuth.LoginAuthRequired;

            if (failedAdminCheck || isBlocked) {
                return {
                    reject: {
                        statusCode: HttpStatus.Forbidden,
                    },
                };
            }

            return {
                context,
            };
        } else if (partiallyAuthenticatedUser) {
            /**
             * Instead of logging users out when they aren't fully authenticated, just forbid the
             * endpoint. This prevents excessive and unexpected auth session termination.
             */
            return {
                reject: {
                    statusCode: HttpStatus.Forbidden,
                },
            };
        } else {
            return {
                reject: {
                    statusCode: HttpStatus.Unauthorized,
                },
            };
        }
    }
}
