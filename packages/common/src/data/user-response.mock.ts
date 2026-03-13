import {applyBrand} from '@augment-vir/common';
import {type Team, type User} from '../database-exports-for-common.js';
import {teamPermissionSelection} from './team-permission.js';
import {type UserResponse} from './user-response.js';

export const mockUserResponse: UserResponse = {
    emailAddress: 'foo@example.com',
    id: applyBrand<User['id']>('mock-user'),
    humanName: 'Mock User',
    isAssumed: undefined,
    isVerified: true,
    isApproved: true,
    isInternalAdmin: undefined,
    teams: [
        {
            id: applyBrand<Team['id']>('mock-team'),
            teamName: 'Mock Team',
        },
    ],
    selectedTeam: {
        team: {
            id: applyBrand<Team['id']>('mock-team'),
            teamName: 'Mock Team',
        },
        ...teamPermissionSelection,
    },
};
