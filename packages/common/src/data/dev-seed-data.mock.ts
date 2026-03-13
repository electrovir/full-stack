/* eslint-disable sonarjs/no-hardcoded-passwords */

import {check} from '@augment-vir/assert';
import {applyBrand, mapObjectValues} from '@augment-vir/common';
import {hashPassword} from 'auth-vir';
import {createUtcFullDate, toUtcIsoString} from 'date-vir';
import {
    ModelName,
    type Team,
    type TeamPermission,
    type User,
} from '../database-exports-for-common.js';
import {type DatabaseInit} from './database-init.mock.js';
import {teamPermissionSelection} from './team-permission.js';

/**
 * YOU SHOULD UPDATE THIS
 *
 * All mock user emails should change from `@example.com` to `@<your-domain>`.
 */

export const mockSeedTeams = {
    adminTeam: {
        id: applyBrand<Team['id']>('mock-seed-admin-team'),
        teamName: 'Mock Seed Admin Team',
        isTeamApprovedByAdmin: true,
        isInternalAdminTeam: true,
    },
    customerTeam: {
        id: applyBrand<Team['id']>('mock-seed-customer-team'),
        teamName: 'Mock Seed Customer Team',
        isTeamApprovedByAdmin: true,
    },
    secondaryTeam: {
        id: applyBrand<Team['id']>('mock-seed-secondary-team'),
        teamName: 'Mock Seed Secondary Team',
        isTeamApprovedByAdmin: true,
    },
} satisfies DatabaseInit<typeof ModelName.Team>;

export const mockSeedUsers = {
    adminUser: {
        id: applyBrand<User['id']>('mock-seed-admin-user'),
        isUserApprovedByAdmin: true,
        emailAddress: 'admin@example.com',
        isInternalAdmin: true,
        normalizedEmailAddress: 'admin@example.com',
        password: 'admin test password',
        humanName: 'Mock Seed Admin',
        accountVerifiedAt: toUtcIsoString(createUtcFullDate('2025-12-20')),
    },
    customerUser: {
        id: applyBrand<User['id']>('mock-seed-customer-user'),
        emailAddress: 'customer@example.com',
        isUserApprovedByAdmin: true,
        isInternalAdmin: false,
        normalizedEmailAddress: 'customer@example.com',
        password: 'customer test password',
        humanName: 'Mock Seed Customer',
        accountVerifiedAt: toUtcIsoString(createUtcFullDate('2025-12-20')),
    },
    blockedUser: {
        id: applyBrand<User['id']>('mock-seed-blocked-user'),
        emailAddress: 'blocked@example.com',
        isUserApprovedByAdmin: false,
        isInternalAdmin: false,
        normalizedEmailAddress: 'blocked@example.com',
        password: 'blocked test password',
        humanName: 'Mock Seed Blocked',
        accountVerifiedAt: toUtcIsoString(createUtcFullDate('2025-12-20')),
    },
    noPermissionsUser: {
        id: applyBrand<User['id']>('mock-seed-no-permissions-user'),
        emailAddress: 'no-permissions@example.com',
        isUserApprovedByAdmin: true,
        isInternalAdmin: false,
        normalizedEmailAddress: 'no-permissions@example.com',
        password: 'no permissions test password',
        humanName: 'Mock Seed No Permissions',
        accountVerifiedAt: toUtcIsoString(createUtcFullDate('2025-12-20')),
    },
} satisfies DatabaseInit<typeof ModelName.User>;

export const mockSeedTeamPermissions = {
    /**
     * Secondary permissions are seeded first so that primary team permissions have a later
     * `createdAt`. The backend selects the most recently created permission as the default team
     * (`orderBy: createdAt DESC`), so this ordering ensures users default to their primary team.
     */
    adminUserSecondaryPermission: {
        id: applyBrand<TeamPermission['id']>('mock-seed-admin-user-secondary-permission'),
        userId: mockSeedUsers.adminUser.id,
        teamId: mockSeedTeams.secondaryTeam.id,
        isEnabled: true,
        ...teamPermissionSelection,
    },
    customerUserSecondaryPermission: {
        id: applyBrand<TeamPermission['id']>('mock-seed-customer-user-secondary-permission'),
        userId: mockSeedUsers.customerUser.id,
        teamId: mockSeedTeams.secondaryTeam.id,
        isEnabled: true,
        ...teamPermissionSelection,
    },
    blockedUserPermission: {
        id: applyBrand<TeamPermission['id']>('mock-seed-blocked-user-permission'),
        userId: mockSeedUsers.blockedUser.id,
        teamId: mockSeedTeams.customerTeam.id,
        isEnabled: true,
        ...teamPermissionSelection,
    },
    adminUserPermission: {
        id: applyBrand<TeamPermission['id']>('mock-seed-admin-user-permission'),
        userId: mockSeedUsers.adminUser.id,
        teamId: mockSeedTeams.adminTeam.id,
        isEnabled: true,
        ...teamPermissionSelection,
    },
    customerUserPermission: {
        id: applyBrand<TeamPermission['id']>('mock-seed-customer-user-permission'),
        userId: mockSeedUsers.customerUser.id,
        teamId: mockSeedTeams.customerTeam.id,
        isEnabled: true,
        ...teamPermissionSelection,
    },
} satisfies DatabaseInit<typeof ModelName.TeamPermission>;

export async function hashMockUserPasswords<
    const MockUsers extends DatabaseInit<typeof ModelName.User>,
>(mockUsersInput: MockUsers): Promise<MockUsers> {
    const mockUsers: DatabaseInit<typeof ModelName.User> = mockUsersInput;

    if (check.isArray(mockUsers)) {
        return (await Promise.all(
            mockUsers.map(async (mockUser) => {
                return {
                    ...mockUser,
                    password: check.isString(mockUser.password)
                        ? await hashPassword(mockUser.password)
                        : null,
                };
            }),
        )) satisfies DatabaseInit<typeof ModelName.User> as DatabaseInit<
            typeof ModelName.User
        > as MockUsers;
    } else {
        return (await mapObjectValues(mockUsers, async (key, mockUser) => {
            return {
                ...mockUser,
                password: check.isString(mockUser.password)
                    ? await hashPassword(mockUser.password)
                    : null,
            };
        })) satisfies DatabaseInit<typeof ModelName.User> as DatabaseInit<
            typeof ModelName.User
        > as MockUsers;
    }
}

export const allMockSeedData: DatabaseInit = [
    /** These are order sensitive! */
    {
        [ModelName.Team]: mockSeedTeams,
    },
    {
        [ModelName.User]: await hashMockUserPasswords(mockSeedUsers),
    },
    {
        [ModelName.TeamPermission]: mockSeedTeamPermissions,
    },
];
