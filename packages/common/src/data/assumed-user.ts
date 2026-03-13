import {defineShape} from 'object-shape-tester';
import {TeamIdShape, UserIdShape} from '../database-exports-for-common.js';

export const assumedUserShape = defineShape({
    teamId: TeamIdShape,
    userId: UserIdShape,
});

export type AssumedUser = typeof assumedUserShape.runtimeType;
