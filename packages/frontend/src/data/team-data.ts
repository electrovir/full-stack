import {assert} from '@augment-vir/assert';
import {type ArrayElement} from '@augment-vir/common';
import {type BackendService, type MakeMissingFieldsOptional} from '@evir/common';

export type AdminTeamData = ArrayElement<
    BackendService['endpoints']['/internal-admin/team-list']['ResponseType']
>;
export type UserTeamData = BackendService['endpoints']['/team/get']['ResponseType'];

assert.tsType<keyof AdminTeamData>().equals<keyof UserTeamData>();

export type TeamData = MakeMissingFieldsOptional<AdminTeamData, UserTeamData>;
