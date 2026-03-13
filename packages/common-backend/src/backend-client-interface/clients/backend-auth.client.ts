import {applyBrand, type PartialWithUndefined, type SelectFrom} from '@augment-vir/common';
import {
    assumedUserShape,
    csrfOptions,
    DeployEnv,
    filterValidTeamPermissions,
    SortOrder,
    teamPermissionSelection,
    type AssumedUser,
    type FullModel,
    type ModelName,
    type PrismaClient,
    type Team,
    type TeamPermission,
    type TeamPermissionSelection,
    type User,
} from '@evir/common';
import {BackendAuthClient as BackendAuthClientVir} from 'auth-vir';
import {type IncomingHttpHeaders} from 'node:http';
import {parseJsonWithShape} from 'object-shape-tester';
import {buildUrl} from 'url-vir';
import {getSelectedTeamIdFromHeaders} from '../../data/selected-team-id.js';
import {type BackendEnvClient} from './backend-env.client.js';
import {type BackendSecretsClient} from './backend-secrets.client.js';

/**
 * This is used when a user tries to create a new account for an email address that already exists.
 * We make it look like the account creation worked but inside the encrypted JWT they receive this
 * invalid user id, which can't actually be used for anything.
 */
export const invalidUserId = applyBrand<User['id']>('-1');

export function extractRequestOrigin(
    backendEnvClient: Readonly<BackendEnvClient>,
    requestHeaders: IncomingHttpHeaders,
) {
    const origin = requestHeaders.origin;

    if (backendEnvClient.deployEnv !== DeployEnv.Dev || !origin) {
        return undefined;
    }

    const requestOrigin = buildUrl(origin, {
        port: backendEnvClient.serverPort,
    }).origin;

    return requestOrigin;
}

export function createBackendAuthClient({
    backendSecretsClient,
    prismaClient,
    backendEnvClient,
}: Readonly<{
    backendSecretsClient: Readonly<BackendSecretsClient>;
    prismaClient: Readonly<PrismaClient>;
    backendEnvClient: Readonly<BackendEnvClient>;
}>) {
    return new BackendAuthClientVir<AuthenticatedUser, User['id'], AssumedUser>({
        getJwtKeys() {
            return backendSecretsClient.get.jwtKeys;
        },
        generateServiceOrigin({requestHeaders}) {
            const origin = requestHeaders.origin;

            if (backendEnvClient.deployEnv !== DeployEnv.Dev || !origin) {
                return undefined;
            }

            const requestOrigin = buildUrl(origin, {
                port: backendEnvClient.serverPort,
            }).origin;

            return requestOrigin;
        },
        async getUserFromDatabase({assumingUser, isSignUpCookie, userId, requestHeaders}) {
            const selectedTeamId =
                getSelectedTeamIdFromHeaders(requestHeaders) || assumingUser?.teamId;

            const rawUser =
                (userId &&
                    (await prismaClient.user.findUnique({
                        where: {
                            id: userId,
                            deactivatedAt: null,
                            ...(isSignUpCookie
                                ? {}
                                : {
                                      accountVerifiedAt: {
                                          not: null,
                                      },
                                  }),
                        },
                        select: {
                            id: true,
                            accountVerifiedAt: true,
                            emailAddress: true,
                            humanName: true,
                            isInternalAdmin: true,
                            isUserApprovedByAdmin: true,
                            normalizedEmailAddress: true,
                            teamPermissions: {
                                where: {
                                    isEnabled: true,
                                    team: {
                                        deactivatedAt: null,
                                    },
                                },
                                select: {
                                    isEnabled: true,
                                    teamId: true,
                                    ...teamPermissionSelection,
                                    team: {
                                        select: {
                                            id: true,
                                            deactivatedAt: true,
                                            isTeamApprovedByAdmin: true,
                                            isInternalAdminTeam: true,
                                            teamName: true,
                                        },
                                    },
                                },
                                orderBy: {
                                    createdAt: SortOrder.desc,
                                },
                            },
                        },
                    }))) ||
                undefined;

            if (!rawUser) {
                return undefined;
            }

            const validTeamPermissions = filterValidTeamPermissions(rawUser.teamPermissions);

            const selectedTeamPermission = selectedTeamId
                ? validTeamPermissions.find((tp) => tp.teamId === selectedTeamId)
                : validTeamPermissions[0];

            const authenticatedUser: AuthenticatedUser = {
                id: rawUser.id,
                accountVerifiedAt: rawUser.accountVerifiedAt,
                emailAddress: rawUser.emailAddress,
                humanName: rawUser.humanName,
                isInternalAdmin:
                    !!selectedTeamPermission?.team.isInternalAdminTeam && rawUser.isInternalAdmin,
                isUserApprovedByAdmin: rawUser.isUserApprovedByAdmin,
                normalizedEmailAddress: rawUser.normalizedEmailAddress,
                teamPermissions: validTeamPermissions,
                selectedTeam: selectedTeamPermission,
                isAssumed: !!assumingUser,
            };

            return authenticatedUser;
        },
        isDev: backendEnvClient.deployEnv === DeployEnv.Dev,
        serviceOrigin: backendEnvClient.backendService.serviceOrigin,
        maxSessionDuration: {
            days: 30,
        },
        sessionRefreshStartTime: {
            days: 1,
        },
        csrf: csrfOptions,
        userSessionIdleTimeout: {
            days: 3,
        },
        assumeUser: {
            canAssumeUser(user) {
                return user.isInternalAdmin;
            },
            parseAssumedUserHeaderValue(data) {
                if (!data) {
                    return undefined;
                }

                try {
                    const parsedData = parseJsonWithShape(data, assumedUserShape);

                    return {
                        assumedUserParams: parsedData,
                        userId: parsedData.userId,
                    };
                } catch {
                    return undefined;
                }
            },
        },
    });
}

export type BackendAuthClient = Awaited<ReturnType<typeof createBackendAuthClient>>;

export type AuthenticatedUser = SelectFrom<
    FullModel<typeof ModelName.User>,
    {
        id: true;
        accountVerifiedAt: true;
        emailAddress: true;
        humanName: true;
        isInternalAdmin: true;
        normalizedEmailAddress: true;
        isUserApprovedByAdmin: true;

        teamPermissions: TeamPermissionSelection & {
            isEnabled: true;

            team: {
                id: true;
                teamName: true;
                deactivatedAt: true;
                isInternalAdminTeam: true;
                isTeamApprovedByAdmin: true;
            };
        };
    }
> & {
    selectedTeam:
        | (SelectFrom<TeamPermission, TeamPermissionSelection> & {
              team: SelectFrom<
                  Team,
                  {
                      id: true;
                      isTeamApprovedByAdmin: true;
                      isInternalAdminTeam: true;
                      teamName: true;
                  }
              >;
          })
        | undefined
        | null;
} & PartialWithUndefined<{
        /** If `true`, indicates that the current authenticated user has been an assumed by an admin. */
        isAssumed: boolean;
    }>;
