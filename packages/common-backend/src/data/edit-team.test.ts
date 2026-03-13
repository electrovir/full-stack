import {applyBrand} from '@augment-vir/common';
import {describe, itCases} from '@augment-vir/test';
import {type Team, type User} from '@evir/common';
import {createUtcFullDate, toUtcIsoString} from 'date-vir';
import {type AuthenticatedUser} from '../backend-client-interface/clients/backend-auth.client.js';
import {hasValidTeamPermission} from './edit-team.js';

const verifiedAt = toUtcIsoString(createUtcFullDate('2025-06-01T00:00:00.000Z'));

const baseTeam = {
    id: applyBrand<Team['id']>('test-team-id'),
    teamName: 'Test Team',
    isTeamApprovedByAdmin: true,
    isInternalAdminTeam: false,
};

const baseSelectedTeam = {
    canManageUsers: true,
    canEditTeamDetails: true,
    team: baseTeam,
};

const baseUser: AuthenticatedUser = {
    id: applyBrand<User['id']>('test-user-id'),
    accountVerifiedAt: verifiedAt,
    emailAddress: 'test@example.com',
    humanName: 'Test User',
    isInternalAdmin: false,
    isUserApprovedByAdmin: true,
    normalizedEmailAddress: 'test@example.com',
    teamPermissions: [
        {
            ...baseSelectedTeam,
            isEnabled: true,
            team: {
                ...baseTeam,
                deactivatedAt: null,
            },
        },
    ],
    selectedTeam: baseSelectedTeam,
    isAssumed: undefined,
};

describe(hasValidTeamPermission.name, () => {
    itCases(hasValidTeamPermission, [
        {
            it: 'returns true for internal admin regardless of permissions',
            inputs: [
                {
                    ...baseUser,
                    isInternalAdmin: true,
                    selectedTeam: {
                        ...baseSelectedTeam,
                        canManageUsers: false,
                        canEditTeamDetails: false,
                    },
                },
                {
                    canManageUsers: true,
                },
            ],
            expect: true,
        },
        {
            it: 'returns false when user is not approved by admin',
            inputs: [
                {
                    ...baseUser,
                    isUserApprovedByAdmin: false,
                },
                {
                    canManageUsers: true,
                },
            ],
            expect: false,
        },
        {
            it: 'returns false when account is not verified',
            inputs: [
                {
                    ...baseUser,
                    accountVerifiedAt: null,
                },
                {
                    canManageUsers: true,
                },
            ],
            expect: false,
        },
        {
            it: 'returns false when no team is selected',
            inputs: [
                {
                    ...baseUser,
                    selectedTeam: undefined,
                },
                {
                    canManageUsers: true,
                },
            ],
            expect: false,
        },
        {
            it: 'returns false when selected team is not approved by admin',
            inputs: [
                {
                    ...baseUser,
                    selectedTeam: {
                        ...baseSelectedTeam,
                        team: {
                            ...baseTeam,
                            isTeamApprovedByAdmin: false,
                        },
                    },
                },
                {
                    canManageUsers: true,
                },
            ],
            expect: false,
        },
        {
            it: 'returns true when user has the required permission',
            inputs: [
                baseUser,
                {
                    canManageUsers: true,
                },
            ],
            expect: true,
        },
        {
            it: 'returns false when user lacks the required permission',
            inputs: [
                {
                    ...baseUser,
                    selectedTeam: {
                        ...baseSelectedTeam,
                        canManageUsers: false,
                    },
                },
                {
                    canManageUsers: true,
                },
            ],
            expect: false,
        },
        {
            it: 'returns true when all required permissions are present',
            inputs: [
                baseUser,
                {
                    canManageUsers: true,
                    canEditTeamDetails: true,
                },
            ],
            expect: true,
        },
        {
            it: 'returns false when only some required permissions are present',
            inputs: [
                {
                    ...baseUser,
                    selectedTeam: {
                        ...baseSelectedTeam,
                        canEditTeamDetails: false,
                    },
                },
                {
                    canManageUsers: true,
                    canEditTeamDetails: true,
                },
            ],
            expect: false,
        },
        {
            it: 'ignores permissions not marked as required',
            inputs: [
                {
                    ...baseUser,
                    selectedTeam: {
                        ...baseSelectedTeam,
                        canEditTeamDetails: false,
                    },
                },
                {
                    canManageUsers: true,
                    canEditTeamDetails: false,
                },
            ],
            expect: true,
        },
    ]);
});
