import {check} from '@augment-vir/assert';
import {applyBrand} from '@augment-vir/common';
import {CustomHeader, type Team} from '@evir/common';
import {type IncomingHttpHeaders} from 'node:http';

export function getSelectedTeamIdFromHeaders(headers: IncomingHttpHeaders): Team['id'] | undefined {
    const headerValue = headers[CustomHeader.SelectedTeamId];
    const teamId: string | undefined = check.isArray(headerValue) ? headerValue[0] : headerValue;

    return applyBrand<Team['id']>(teamId);
}
