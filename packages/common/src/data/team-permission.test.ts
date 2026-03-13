import {assert} from '@augment-vir/assert';
import {type SelectFrom} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {createUtcFullDate, toUtcIsoString} from 'date-vir';
import {type FullModel, type ModelName} from '../database-exports-for-common.js';
import {filterValidTeamPermissions, teamPermissionSelection} from './team-permission.js';

describe('teamPermissionSelection', () => {
    it('includes all team permission fields', () => {
        assert.deepEquals(teamPermissionSelection, {
            canEditTeamDetails: true,
            canManageUsers: true,
        });
    });
});

describe(filterValidTeamPermissions.name, () => {
    type TestPermission = SelectFrom<
        FullModel<typeof ModelName.TeamPermission>,
        {
            isEnabled: true;

            team: {
                deactivatedAt: true;
                isTeamApprovedByAdmin: true;
            };
        }
    >;

    const basePermission: TestPermission = {
        isEnabled: true,
        team: {
            deactivatedAt: null,
            isTeamApprovedByAdmin: true,
        },
    };

    itCases(filterValidTeamPermissions<TestPermission>, [
        {
            it: 'returns empty array for empty input',
            input: [],
            expect: [],
        },
        {
            it: 'keeps a fully valid permission',
            input: [
                basePermission,
            ],
            expect: [
                basePermission,
            ],
        },
        {
            it: 'filters out disabled permission',
            input: [
                {
                    ...basePermission,
                    isEnabled: false,
                },
            ],
            expect: [],
        },
        {
            it: 'filters out deactivated team',
            input: [
                {
                    ...basePermission,
                    team: {
                        ...basePermission.team,
                        deactivatedAt: toUtcIsoString(createUtcFullDate('2025-01-01')),
                    },
                },
            ],
            expect: [],
        },
        {
            it: 'filters out unapproved team',
            input: [
                {
                    ...basePermission,
                    team: {
                        ...basePermission.team,
                        isTeamApprovedByAdmin: false,
                    },
                },
            ],
            expect: [],
        },
        {
            it: 'keeps only valid permissions from a mixed set',
            input: [
                basePermission,
                {
                    ...basePermission,
                    isEnabled: false,
                },
                {
                    ...basePermission,
                    team: {
                        ...basePermission.team,
                        deactivatedAt: toUtcIsoString(createUtcFullDate('2025-06-01')),
                    },
                },
                {
                    ...basePermission,
                    team: {
                        ...basePermission.team,
                        isTeamApprovedByAdmin: false,
                    },
                },
            ],
            expect: [
                basePermission,
            ],
        },
    ]);
});
