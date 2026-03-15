import {applyBrand, HttpStatus} from '@augment-vir/common';
import {backendDefinitionShapes, ModelName, type TeamPermission, type User} from '@evir/common';
import {
    hashMockUserPasswords,
    mockSeedTeams,
    mockSeedUsers,
} from '@evir/common/src/data/dev-seed-data.mock.js';
import {createUtcFullDate, toUtcIsoString} from 'date-vir';
import {describeEndpoint} from './test-endpoints.mock.js';

const extraUsers = await hashMockUserPasswords({
    deactivatedUser: {
        id: applyBrand<User['id']>('deactivated-user'),
        emailAddress: 'deactivated@example.com',
        normalizedEmailAddress: 'deactivated@example.com',
        password: 'deactivated test password',
        humanName: 'Deactivated User',
        isUserApprovedByAdmin: true,
        accountVerifiedAt: toUtcIsoString(createUtcFullDate('2025-12-20')),
        deactivatedAt: toUtcIsoString(createUtcFullDate('2025-12-25')),
    },
    invitedUnverifiedUser: {
        id: applyBrand<User['id']>('invited-unverified-user'),
        emailAddress: 'invited@example.com',
        normalizedEmailAddress: 'invited@example.com',
        password: 'invited test password',
        humanName: 'Invited Unverified User',
        isUserApprovedByAdmin: true,
    },
});

describeEndpoint(backendDefinitionShapes.endpoints['/team/get'], ({endpointCases}) => {
    endpointCases(
        {
            databaseInit: [
                {
                    [ModelName.User]: extraUsers,
                },
                {
                    [ModelName.TeamPermission]: {
                        deactivatedUserPermission: {
                            id: applyBrand<TeamPermission['id']>('deactivated-user-permission'),
                            userId: extraUsers.deactivatedUser.id,
                            teamId: mockSeedTeams.customerTeam.id,
                            isEnabled: true,
                        },
                        invitedUnverifiedUserPermission: {
                            id: applyBrand<TeamPermission['id']>(
                                'invited-unverified-user-permission',
                            ),
                            userId: extraUsers.invitedUnverifiedUser.id,
                            teamId: mockSeedTeams.customerTeam.id,
                            isEnabled: true,
                        },
                    },
                },
            ],
            responseSelect: {
                users: true,
            },
        },
        [
            {
                it: 'omits deactivated users and unverified invited users',
                input: {
                    authenticatedUserEmail: mockSeedUsers.customerUser.emailAddress,
                },
                expect: {
                    response: {
                        status: HttpStatus.Ok,
                        body: {
                            users: [
                                {
                                    id: mockSeedUsers.customerUser.id,
                                    emailAddress: mockSeedUsers.customerUser.emailAddress,
                                    humanName: mockSeedUsers.customerUser.humanName,
                                    accountVerifiedAt: mockSeedUsers.customerUser.accountVerifiedAt,
                                    accountLockedAt: null,
                                    canManageUsers: true,
                                    canEditTeamDetails: true,
                                },
                                {
                                    id: mockSeedUsers.blockedUser.id,
                                    emailAddress: mockSeedUsers.blockedUser.emailAddress,
                                    humanName: mockSeedUsers.blockedUser.humanName,
                                    accountVerifiedAt: mockSeedUsers.blockedUser.accountVerifiedAt,
                                    accountLockedAt: null,
                                    canManageUsers: true,
                                    canEditTeamDetails: true,
                                },
                            ],
                        },
                    },
                },
            },
        ],
    );
});
