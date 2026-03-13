import {
    ensureNullableShape,
    exactShape,
    intersectShape,
    nullableShape,
    pickShape,
} from 'object-shape-tester';
import {TeamPermissionShape, TeamShape, UserShape} from '../database-exports-for-common.js';
import {teamPermissionSelection} from './team-permission.js';

/** The same shape for all endpoints that respond with a user. */
export const userResponseShape = ensureNullableShape(
    intersectShape(
        pickShape(UserShape, {
            id: true,
            emailAddress: true,
            humanName: true,
        }),
        {
            /** Indicates whether this user was assumed/impersonated by an admin. */
            isAssumed: nullableShape(false),
            isVerified: false,
            isApproved: false,
            isInternalAdmin: nullableShape(exactShape(true)),
            teams: [
                pickShape(TeamShape, {
                    id: true,
                    teamName: true,
                }),
            ],
            selectedTeam: nullableShape(
                intersectShape(
                    {
                        team: pickShape(TeamShape, {
                            id: true,
                            teamName: true,
                        }),
                    },
                    pickShape(TeamPermissionShape, teamPermissionSelection),
                ),
            ),
        },
    ),
);

export type UserResponse = typeof userResponseShape.runtimeType;
