import {describe, it} from '@augment-vir/test';
import {type AdminTeamData, type TeamData, type UserTeamData} from './team-data.js';

describe('TeamData', () => {
    it('accepts AdminTeamData', () => {
        const teamData: TeamData = {} as unknown as AdminTeamData;
    });
    it('accepts UserTeamData', () => {
        const teamData: TeamData = {} as unknown as UserTeamData;
    });
});
