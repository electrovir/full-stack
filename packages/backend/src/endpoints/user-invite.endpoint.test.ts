import {applyBrand, HttpStatus} from '@augment-vir/common';
import {
    backendDefinitionShapes,
    EmailCodeType,
    EventLogName,
    ModelName,
    type Team,
    type TeamPermission,
    type User,
} from '@evir/common';
import {type DatabaseInit} from '@evir/common/src/data/database-init.mock.js';
import {
    hashMockUserPasswords,
    mockSeedTeams,
    mockSeedUsers,
} from '@evir/common/src/data/dev-seed-data.mock.js';
import {describeEndpoint} from './test-endpoints.mock.js';

const extraTeam = {
    newTeam: {
        id: applyBrand<Team['id']>('new-invite-target-team'),
        teamName: 'New Invite Target Team',
        isTeamApprovedByAdmin: true,
    },
} satisfies DatabaseInit<typeof ModelName.Team>;

const extraUsers = await hashMockUserPasswords({
    unverifiedInvitedUser: {
        id: applyBrand<User['id']>('unverified-invited-user'),
        emailAddress: 'unverified-invited@example.com',
        normalizedEmailAddress: 'unverified-invited@example.com',
        /** Invited users have no password. */
        password: null,
        humanName: 'Unverified Invited User',
        isUserApprovedByAdmin: true,
    },
});

describeEndpoint(backendDefinitionShapes.endpoints['/user/invite'], ({endpointCases}) => {
    endpointCases(
        {
            databaseInit: [
                {
                    [ModelName.Team]: extraTeam,
                },
                {
                    [ModelName.User]: extraUsers,
                },
                {
                    [ModelName.TeamPermission]: {
                        unverifiedUserPermission: {
                            id: applyBrand<TeamPermission['id']>(
                                'unverified-invited-user-permission',
                            ),
                            userId: extraUsers.unverifiedInvitedUser.id,
                            teamId: mockSeedTeams.customerTeam.id,
                            isEnabled: true,
                        },
                    },
                },
            ],
        },
        [
            {
                it: 'sends invite email to an existing verified user for a new team',
                input: {
                    authenticatedUserEmail: mockSeedUsers.customerUser.emailAddress,
                    requestData: {
                        emailAddress: mockSeedUsers.customerUser.emailAddress,
                        teamId: extraTeam.newTeam.id,
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EmailCode: [
                                {
                                    codeType: EmailCodeType.UserInvitation,
                                    usedAt: null,
                                    deactivatedAt: null,
                                    emailAddress: mockSeedUsers.customerUser.emailAddress,
                                    userId: mockSeedUsers.customerUser.id,
                                    invitedToTeamId: extraTeam.newTeam.id,
                                },
                            ],
                            EventLog: [
                                {
                                    eventName: EventLogName.EmailCodeSend,
                                    extraData: {
                                        emailAddress: mockSeedUsers.customerUser.emailAddress,
                                        codeType: EmailCodeType.UserInvitation,
                                    },
                                    userId: mockSeedUsers.customerUser.id,
                                    linkProxyId: null,
                                    teamId: extraTeam.newTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Ok,
                    },
                },
            },
            {
                it: 'sends invite email to an existing unverified user for a new team',
                input: {
                    authenticatedUserEmail: mockSeedUsers.customerUser.emailAddress,
                    requestData: {
                        emailAddress: extraUsers.unverifiedInvitedUser.emailAddress,
                        teamId: extraTeam.newTeam.id,
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EmailCode: [
                                {
                                    codeType: EmailCodeType.UserInvitation,
                                    usedAt: null,
                                    deactivatedAt: null,
                                    emailAddress: extraUsers.unverifiedInvitedUser.emailAddress,
                                    userId: extraUsers.unverifiedInvitedUser.id,
                                    invitedToTeamId: extraTeam.newTeam.id,
                                },
                            ],
                            EventLog: [
                                {
                                    eventName: EventLogName.EmailCodeSend,
                                    extraData: {
                                        emailAddress: extraUsers.unverifiedInvitedUser.emailAddress,
                                        codeType: EmailCodeType.UserInvitation,
                                    },
                                    userId: extraUsers.unverifiedInvitedUser.id,
                                    linkProxyId: null,
                                    teamId: extraTeam.newTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Ok,
                    },
                },
            },
            {
                it: 'returns conflict when existing user is already on the team',
                input: {
                    authenticatedUserEmail: mockSeedUsers.customerUser.emailAddress,
                    requestData: {
                        emailAddress: mockSeedUsers.customerUser.emailAddress,
                        teamId: mockSeedTeams.customerTeam.id,
                    },
                },
                expect: {
                    response: {
                        status: HttpStatus.Conflict,
                        body: 'User is already a member of this team.',
                    },
                },
            },
            {
                it: 'rejects unauthenticated requests',
                input: {
                    requestData: {
                        emailAddress: 'anyone@example.com',
                        teamId: mockSeedTeams.customerTeam.id,
                    },
                },
                expect: {
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
        ],
    );
});
