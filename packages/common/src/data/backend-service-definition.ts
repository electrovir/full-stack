import {assert} from '@augment-vir/assert';
import {type SelectFrom, type Values} from '@augment-vir/common';
import {
    AnyOrigin,
    defineService,
    HttpMethod,
    type OriginRequirement,
    type RestVirApi,
} from '@rest-vir/define-service';
import {
    ensureNullableShape,
    enumShape,
    exactShape,
    intersectShape,
    nonEmptyStringShape,
    nullableShape,
    optionalShape,
    partialShape,
    pickShape,
    unionShape,
    unknownShape,
} from 'object-shape-tester';
import {parseUrl} from 'url-vir';
import {
    EmailCodeIdShape,
    EmailCodeType,
    EventLogName,
    TeamIdShape,
    TeamPermissionShape,
    TeamShape,
    UserIdShape,
    UserShape,
} from '../database-exports-for-common.js';
import {DeployEnv} from '../deploy-env.js';
import {TeamFilter} from './team-filter.js';
import {teamPermissionSelection} from './team-permission.js';
import {
    createFrontendUrl,
    defaultRawUniversalConfig,
    type UniversalConfig,
} from './universal-config.js';
import {userResponseShape} from './user-response.js';

export function generateBackendServiceConfig(
    config: Readonly<
        SelectFrom<
            UniversalConfig,
            {
                frontendProductionSubdomain: true;
                topDomain: true;
                services: {
                    backend: {
                        port: true;
                        serviceSubdomain: true;
                    };
                };
            }
        >
    >,
    devHostNames: string[],
) {
    const frontendProduction = createFrontendUrl(DeployEnv.Prod, config);

    return {
        clientOriginRequirements: {
            [DeployEnv.Dev](origin: string | undefined) {
                if (!origin) {
                    return false;
                }

                const hostname = parseUrl(origin).hostname;

                return (
                    devHostNames.includes(hostname) ||
                    hostname === 'localhost' ||
                    origin === createFrontendUrl(DeployEnv.Dev, config).origin
                );
            },
            [DeployEnv.Staging](origin: string | undefined) {
                if (
                    !origin ||
                    origin === frontendProduction.origin ||
                    !origin.startsWith('https://')
                ) {
                    return false;
                }
                const hostname = parseUrl(origin).hostname;

                return hostname.endsWith(config.topDomain);
            },
            [DeployEnv.Prod]: frontendProduction.origin,
        } satisfies Record<DeployEnv, NonNullable<OriginRequirement>>,
        serviceOrigins: {
            [DeployEnv.Dev]: `http://${devHostNames[0] || 'localhost'}:${config.services.backend.port}`,
            [DeployEnv.Staging]: `https://${config.services.backend.serviceSubdomain}.staging.${config.topDomain}`,
            [DeployEnv.Prod]: `https://${config.services.backend.serviceSubdomain}.${config.topDomain}`,
        },
    } as const satisfies Record<string, Record<DeployEnv, unknown>>;
}

export enum EndpointAuth {
    /** A fully authenticated, admin approved, and verified user is _required_ for this endpoint. */
    VerifiedAuthRequired = 'verified-auth-required',
    /**
     * A fully logged in user is allowed for this endpoint, even if the user is not approved or
     * verified.
     */
    LoginAuthRequired = 'login-auth-required',
    /** A partially authenticated user (authenticated by cookie only) is allowed for this endpoint. */
    PartialAuthAllowed = 'partial-auth-allowed',
    /** Authenticated users are _not allowed_ to access this endpoint. */
    BlockAuthenticated = 'block-authenticated',
    /** This endpoint can be accessed by anyone, authenticated or not. */
    Any = 'any',
    /** This endpoint can only be accessed by internal admins. */
    InternalAdminOnly = 'internal-admin-only',
}

export type BackendService = ReturnType<typeof defineBackendService>;
export type BackendEndpointPath = keyof BackendService['endpoints'];
export type BackendEndpoint = Values<BackendService['endpoints']>;
export type BackendApi = RestVirApi<BackendService>;

type CustomEndpointProps = {
    /** The level of auth that is required for this endpoint. */
    requiredAuth: EndpointAuth;
};

assert.tsType<BackendEndpoint['customProps']>().matches<CustomEndpointProps>();

/** Only use this for shape definitions and runtime paths. */
export const backendDefinitionShapes = defineBackendService(
    DeployEnv.Dev,
    defaultRawUniversalConfig,
    [],
);

export function defineBackendService(
    deployEnv: DeployEnv,
    config: Readonly<
        SelectFrom<
            UniversalConfig,
            {
                frontendProductionSubdomain: true;
                topDomain: true;
                services: {
                    backend: {
                        port: true;
                        serviceSubdomain: true;
                        name: true;
                    };
                };
            }
        >
    >,
    devHostNames: string[],
) {
    const backendServiceConfig = generateBackendServiceConfig(config, devHostNames);

    return defineService({
        serviceName: config.services.backend.name,
        requiredClientOrigin: backendServiceConfig.clientOriginRequirements[deployEnv],
        serviceOrigin: backendServiceConfig.serviceOrigins[deployEnv],
        endpoints: {
            /** This endpoint should always be first so that it is used by the dev port scanner. */
            '/health': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: exactShape('ok'),
                requiredClientOrigin: AnyOrigin,
                customProps: {
                    requiredAuth: EndpointAuth.Any,
                },
            },
            /** Same as `/health`. */
            '/': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: exactShape('ok'),
                requiredClientOrigin: AnyOrigin,
                customProps: {
                    requiredAuth: EndpointAuth.Any,
                },
            },
            /** This endpoint always returns an unauthorized response. */
            '/unauthorized': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.Any,
                },
            },
            '/reset-password': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    emailAddress: '',
                },
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.Any,
                },
            },
            '/update-email-address': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    newEmailAddress: '',
                },
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.VerifiedAuthRequired,
                },
            },
            /** Get user information from an active session. */
            '/user': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: userResponseShape,
                customProps: {
                    requiredAuth: EndpointAuth.LoginAuthRequired,
                },
            },
            /** Intentionally throw an error whenever this endpoint is hit. For testing purposes. */
            '/error': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: undefined,
                requiredClientOrigin: AnyOrigin,
                customProps: {
                    requiredAuth: EndpointAuth.Any,
                },
            },
            '/sign-up': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    emailAddress: '',
                    password: nonEmptyStringShape(),
                    info: {
                        /** The name of the user, not their username. */
                        humanName: '',
                        teamName: '',
                    },
                },
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.BlockAuthenticated,
                },
            },
            '/login': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    emailAddress: '',
                    password: nonEmptyStringShape(),
                },
                responseDataShape: unionShape(userResponseShape, {
                    emailSent: exactShape(true),
                }),
                customProps: {
                    requiredAuth: EndpointAuth.BlockAuthenticated,
                },
            },
            '/feedback': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    feedback: '',
                    /** The URL the user was on when the triggered the feedback modal. */
                    startUrl: '',
                    /**
                     * The URL the user was on when the submitted their feedback from the feedback
                     * modal.
                     */
                    submitUrl: '',
                },
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.VerifiedAuthRequired,
                },
            },
            /** Verify an email code. */
            '/verify': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    id: EmailCodeIdShape,
                    /** The actual randomized code to verify. */
                    code: '',
                    codeType: enumShape(EmailCodeType),
                    /** A new password for password reset code verification. */
                    newPassword: optionalShape(nonEmptyStringShape()),
                    /** The user's name, used when accepting an invitation. */
                    newHumanName: optionalShape(nonEmptyStringShape()),
                },
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.Any,
                },
            },
            '/get-link/:linkId': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: {
                    link: '',
                },
                customProps: {
                    requiredAuth: EndpointAuth.VerifiedAuthRequired,
                },
            },
            '/resend-link': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    codeType: enumShape(EmailCodeType),
                },
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.LoginAuthRequired,
                },
            },
            '/internal-admin/event-graph': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    team: unionShape(
                        {
                            /** Return a line graph for each team. */
                            allTeams: exactShape(true),
                            teamId: nullableShape(undefined),
                        },
                        {
                            allTeams: nullableShape(undefined),
                            /**
                             * Return a specific team's data. If the event supports graphing of the
                             * `extraData` event table field, that will be used for the data
                             * points.
                             */
                            teamId: TeamIdShape,
                        },
                    ),
                    eventName: enumShape(EventLogName),
                },
                responseDataShape: {
                    labels: [''],
                    datasets: [
                        {
                            label: '',
                            data: [0],
                        },
                    ],
                },
                customProps: {
                    requiredAuth: EndpointAuth.InternalAdminOnly,
                },
            },
            '/internal-admin/dev-db': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    query: '',
                },
                responseDataShape: unknownShape(),
                customProps: {
                    requiredAuth: EndpointAuth.InternalAdminOnly,
                },
            },
            '/internal-admin/team-list': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    teamFilter: enumShape(TeamFilter),
                },
                responseDataShape: [
                    {
                        team: pickShape(TeamShape, {
                            id: true,
                            teamName: true,
                            isInternalAdminTeam: true,
                            isTestTeam: true,
                            isTeamApprovedByAdmin: true,
                            deactivatedAt: true,
                        }),
                        users: [
                            intersectShape(
                                pickShape(UserShape, {
                                    id: true,
                                    emailAddress: true,
                                    humanName: true,
                                    isInternalAdmin: true,
                                    isTestUser: true,
                                    accountVerifiedAt: true,
                                    accountLockedAt: true,
                                }),
                                pickShape(TeamPermissionShape, teamPermissionSelection),
                            ),
                        ],
                    },
                ],
                customProps: {
                    requiredAuth: EndpointAuth.InternalAdminOnly,
                },
            },
            '/internal-admin/resend-invite': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    userId: UserIdShape,
                    teamId: TeamIdShape,
                },
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.InternalAdminOnly,
                },
            },
            '/internal-admin/create-team': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: pickShape(TeamShape, {
                    teamName: true,
                    isTeamApprovedByAdmin: true,
                    isTestTeam: true,
                }),
                responseDataShape: pickShape(TeamShape, {
                    id: true,
                    teamName: true,
                }),
                customProps: {
                    requiredAuth: EndpointAuth.InternalAdminOnly,
                },
            },
            '/internal-admin/deactivate-team': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    teamId: TeamIdShape,
                },
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.InternalAdminOnly,
                },
            },
            '/internal-admin/unlock-user': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: pickShape(UserShape, {
                    id: true,
                }),
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.InternalAdminOnly,
                },
            },
            '/user/edit': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: intersectShape(
                    {
                        userId: UserIdShape,
                        teamId: nullableShape(TeamIdShape),
                    },
                    ensureNullableShape(
                        partialShape(
                            pickShape(UserShape, {
                                humanName: true,
                                emailAddress: true,
                                isInternalAdmin: true,
                                isTestUser: true,
                            }),
                        ),
                    ),
                    ensureNullableShape(
                        partialShape(pickShape(TeamPermissionShape, teamPermissionSelection)),
                    ),
                ),
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.VerifiedAuthRequired,
                },
            },
            '/user/deactivate': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: {
                    userId: UserIdShape,
                    teamId: nullableShape(TeamIdShape),
                },
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.VerifiedAuthRequired,
                },
            },
            '/user/invite': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: intersectShape(
                    pickShape(UserShape, {
                        emailAddress: true,
                    }),
                    {
                        teamId: TeamIdShape,
                    },
                ),
                responseDataShape: nullableShape(
                    pickShape(UserShape, {
                        id: true,
                    }),
                ),
                customProps: {
                    requiredAuth: EndpointAuth.VerifiedAuthRequired,
                },
            },
            '/team/edit': {
                methods: {
                    [HttpMethod.Post]: true,
                },
                requestDataShape: intersectShape(
                    {
                        /** If this id is omitted, the user's own team will be modified. */
                        teamId: nullableShape(TeamIdShape),
                    },
                    ensureNullableShape(
                        partialShape(
                            pickShape(TeamShape, {
                                teamName: true,

                                /** The follow fields can only be edited by admins. */
                                isTeamApprovedByAdmin: true,
                                isTestTeam: true,
                            }),
                        ),
                    ),
                ),
                responseDataShape: undefined,
                customProps: {
                    requiredAuth: EndpointAuth.InternalAdminOnly,
                },
            },
            '/team/get': {
                methods: {
                    [HttpMethod.Get]: true,
                },
                requestDataShape: undefined,
                responseDataShape: {
                    team: pickShape(TeamShape, {
                        id: true,
                        teamName: true,
                    }),
                    users: [
                        intersectShape(
                            pickShape(UserShape, {
                                id: true,
                                emailAddress: true,
                                humanName: true,
                                accountVerifiedAt: true,
                                accountLockedAt: true,
                            }),
                            pickShape(TeamPermissionShape, teamPermissionSelection),
                        ),
                    ],
                },
                customProps: {
                    requiredAuth: EndpointAuth.VerifiedAuthRequired,
                },
            },
        },
    });
}
