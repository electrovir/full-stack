import {getEnumValues, log} from '@augment-vir/common';
import {csrfHeaderName, CustomHeader, DeployEnv, type BackendEndpoint} from '@evir/common';
import {type BackendClientInterface} from '@evir/common-backend';
import {getBackendClientInterface} from '@evir/common-backend/src/backend-client-interface/backend-client-interface-store.js';
import {
    defaultServiceLogger,
    HttpStatus,
    implementService,
    RestVirHandlerError,
    silentServiceLogger,
    type ContextInitOutput,
    type ServiceLogger,
} from '@rest-vir/implement-service';
import {AuthHeaderName} from 'auth-vir';
import {handleError} from 'sentry-vir';
import {createBackendContext, type BackendContext} from './context/create-backend-context.js';
import {feedbackEndpoint} from './endpoints/feedback.endpoint.js';
import {getLinkEndpoint} from './endpoints/get-link.endpoint.js';
import {healthEndpoint} from './endpoints/health.endpoint.js';
import {internalAdminCreateTeamEndpoint} from './endpoints/internal-admin/internal-admin-create-team.endpoint.js';
import {internalAdminDeactivateTeamEndpoint} from './endpoints/internal-admin/internal-admin-deactivate-team.endpoint.js';
import {internalAdminDevDbEndpoint} from './endpoints/internal-admin/internal-admin-dev-db.endpoint.js';
import {internalAdminEventGraphEndpoint} from './endpoints/internal-admin/internal-admin-event-graph.endpoint.js';
import {internalAdminResendInviteEndpoint} from './endpoints/internal-admin/internal-admin-resend-invite.endpoint.js';
import {internalAdminTeamListEndpoint} from './endpoints/internal-admin/internal-admin-team-list.endpoint.js';
import {internalAdminUnlockUserEndpoint} from './endpoints/internal-admin/internal-admin-unlock-user.endpoint.js';
import {loginEndpoint} from './endpoints/login.endpoint.js';
import {resendLinkEndpoint} from './endpoints/resend-link.endpoint.js';
import {resetPasswordEndpoint} from './endpoints/reset-password.endpoint.js';
import {signUpEndpoint} from './endpoints/sign-up.endpoint.js';
import {teamEditEndpoint} from './endpoints/team-edit.endpoint.js';
import {teamGetEndpoint} from './endpoints/team-get.endpoint.js';
import {updateEmailAddress} from './endpoints/update-email-address.endpoint.js';
import {userDeactivateEndpoint} from './endpoints/user-deactivate.endpoint.js';
import {userEditEndpoint} from './endpoints/user-edit.endpoint.js';
import {userInviteEndpoint} from './endpoints/user-invite.endpoint.js';
import {userEndpoint} from './endpoints/user.endpoint.js';
import {verifyEndpoint} from './endpoints/verify.endpoint.js';

export const sentryErrorLogger: ServiceLogger['error'] = (error) => {
    if (
        !(error instanceof RestVirHandlerError) ||
        error.status === HttpStatus.InternalServerError
    ) {
        /** Only send unexpected errors to Sentry. */
        handleError(error);
    } else {
        log.error(error);
    }
};

export const devServiceLogger: ServiceLogger = {
    ...defaultServiceLogger,
    error: sentryErrorLogger,
};

export const releaseServiceLogger: ServiceLogger = {
    ...silentServiceLogger,
    /** Keep error logging. */
    error: sentryErrorLogger,
};

export function implementBackend(defaultBackendClientInterface: Readonly<BackendClientInterface>) {
    return implementService({
        service: defaultBackendClientInterface.backendEnvClient.backendService,
        logger:
            defaultBackendClientInterface.backendEnvClient.deployEnv === DeployEnv.Dev
                ? devServiceLogger
                : releaseServiceLogger,
        customHeaders: [
            ...getEnumValues(AuthHeaderName),
            ...getEnumValues(CustomHeader),
            csrfHeaderName,
        ],
        async createContext({
            requestHeaders,
            endpointDefinition,
            searchParams,
            response,
            request,
        }): Promise<ContextInitOutput<BackendContext>> {
            if (!endpointDefinition) {
                return {
                    reject: {
                        statusCode: HttpStatus.NotFound,
                    },
                };
            }

            return await createBackendContext(
                await getBackendClientInterface(defaultBackendClientInterface, searchParams),
                requestHeaders,
                endpointDefinition as BackendEndpoint,
                response,
                request,
            );
        },
    })({
        async postHook({originalStatus, requestHeaders, response, searchParams}) {
            const backendClientInterface = await getBackendClientInterface(
                defaultBackendClientInterface,
                searchParams,
            );

            if (originalStatus === HttpStatus.Unauthorized) {
                const signUpUser = await backendClientInterface.backendAuthClient.getSecureUser({
                    requestHeaders,
                    isSignUpCookie: true,
                    allowUserAuthRefresh: false,
                });

                const hasExistingSignUpCookie = !response.getHeader('set-cookie') && !!signUpUser;

                /**
                 * Set the user status header so the frontend doesn't clear the CSRF token when a
                 * valid sign up cookie exists.
                 */
                const userStatusHeaders = hasExistingSignUpCookie
                    ? {
                          [AuthHeaderName.IsSignUpAuth]: 'true',
                      }
                    : undefined;

                const logoutCookieHeaders =
                    await backendClientInterface.backendAuthClient.createLogoutHeaders({
                        ...(hasExistingSignUpCookie
                            ? {
                                  isSignUpCookie: false,
                              }
                            : {
                                  allCookies: true,
                              }),
                    });

                const removeCsrfTokenHeader = hasExistingSignUpCookie
                    ? undefined
                    : {
                          [csrfHeaderName]: logoutCookieHeaders[csrfHeaderName],
                      };

                return {
                    headers: {
                        'set-cookie': logoutCookieHeaders['set-cookie'],
                        ...removeCsrfTokenHeader,
                        ...userStatusHeaders,
                    },
                };
            }

            return undefined;
        },
        endpoints: {
            '/health': healthEndpoint,
            '/': healthEndpoint,
            '/unauthorized'() {
                return {
                    statusCode: HttpStatus.Unauthorized,
                };
            },
            '/error'() {
                throw new Error('Intentional error.');
            },

            '/feedback': feedbackEndpoint,
            '/get-link/:linkId': getLinkEndpoint,
            '/internal-admin/create-team': internalAdminCreateTeamEndpoint,
            '/internal-admin/deactivate-team': internalAdminDeactivateTeamEndpoint,
            '/internal-admin/dev-db': internalAdminDevDbEndpoint,
            '/internal-admin/event-graph': internalAdminEventGraphEndpoint,
            '/internal-admin/resend-invite': internalAdminResendInviteEndpoint,
            '/internal-admin/team-list': internalAdminTeamListEndpoint,
            '/internal-admin/unlock-user': internalAdminUnlockUserEndpoint,
            '/login': loginEndpoint,
            '/resend-link': resendLinkEndpoint,
            '/reset-password': resetPasswordEndpoint,
            '/sign-up': signUpEndpoint,
            '/team/edit': teamEditEndpoint,
            '/team/get': teamGetEndpoint,
            '/update-email-address': updateEmailAddress,
            '/user': userEndpoint,
            '/user/deactivate': userDeactivateEndpoint,
            '/user/edit': userEditEndpoint,
            '/user/invite': userInviteEndpoint,
            '/verify': verifyEndpoint,
        },
    });
}

export type BackendServiceImplementation = ReturnType<typeof implementBackend>;
