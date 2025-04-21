import {HttpStatus, randomInteger, wait, type SelectFrom} from '@augment-vir/common';
import {type FullModel, type TemplateService} from '@evir/common';
import {type EndpointDefinition} from '@rest-vir/define-service';
import {type ContextInit} from '@rest-vir/implement-service';
import {extractUserIdFromRequestHeaders} from 'auth-vir';
import {type IncomingHttpHeaders} from 'node:http';
import {type BackendClientInterface} from '../backend-client-interface/backend-client-interface.js';

export type BackendContext = BackendClientInterface & {
    authenticatedUser:
        | SelectFrom<
              FullModel<'user'>,
              {
                  id: true;
                  emailAddress: true;
              }
          >
        | undefined;
};

enum Auth {
    /** An authenticated user is _required_ for this endpoint. */
    Required = 'required',
    /** Authenticated users are _not allowed_ to access this endpoint. */
    Blocked = 'blocked',
    /** This endpoint can be accessed whether the user is authenticated or not. */
    Any = 'any',
}

const endpointAuth: Record<string, Auth> = {
    '/': Auth.Any,
    '/health': Auth.Any,
    '/login': Auth.Blocked,
    '/reset-password': Auth.Blocked,
    '/sign-up': Auth.Blocked,
    '/update-email-address': Auth.Required,
    '/user': Auth.Required,
    '/verify': Auth.Any,
} satisfies Record<keyof TemplateService['endpoints'], Auth>;

export async function createBackendContext(
    backendClientInterface: Readonly<BackendClientInterface>,
    requestHeaders: IncomingHttpHeaders,
    endpoint: Readonly<EndpointDefinition>,
): Promise<ReturnType<ContextInit<BackendContext, any, any, any>>> {
    /**
     * This is not safe because it has not been checked yet that this user id is still active.
     *
     * @deprecated Unsafe
     */
    const _unsafe_authenticatedUserId = await extractUserIdFromRequestHeaders(
        requestHeaders,
        backendClientInterface.jwtClient.jwtParams,
    );

    const authenticatedUser =
        // eslint-disable-next-line sonarjs/deprecation, @typescript-eslint/no-deprecated
        (_unsafe_authenticatedUserId &&
            (await backendClientInterface.prismaClient.user.findFirst({
                where: {
                    // eslint-disable-next-line sonarjs/deprecation, @typescript-eslint/no-deprecated
                    id: _unsafe_authenticatedUserId,
                    deactivatedAt: null,
                    accountVerifiedAt: {
                        not: null,
                    },
                },
                select: {
                    id: true,
                    emailAddress: true,
                } satisfies Record<keyof NonNullable<BackendContext['authenticatedUser']>, boolean>,
            }))) ||
        undefined;

    if (!authenticatedUser) {
        /** Throttle all unauthenticated requests. */
        await wait({
            milliseconds: randomInteger({min: 500, max: 1500}),
        });
    }

    const authRequirement = endpointAuth[endpoint.path];
    const context: BackendContext = {
        authenticatedUser,
        ...backendClientInterface,
    };

    if (!authRequirement) {
        return {
            reject: {
                statusCode: HttpStatus.NotFound,
            },
        };
    } else if (authRequirement === Auth.Any) {
        return {context};
    } else if (authRequirement === Auth.Blocked) {
        if (authenticatedUser) {
            return {
                reject: {
                    statusCode: HttpStatus.BadRequest,
                },
            };
        } else {
            return {context};
        }
    } else if ((authRequirement as Auth) === Auth.Required) {
        if (authenticatedUser) {
            return {context};
        } else {
            return {
                reject: {
                    statusCode: HttpStatus.Unauthorized,
                },
            };
        }
    } else {
        throw new Error(`Unexpected auth requirement: '${authRequirement}'`);
    }
}
