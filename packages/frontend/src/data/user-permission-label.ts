import {type TeamPermissionField} from '@evir/common';
import {type AppI18nClient} from './frontend-state/frontend-clients/app-i18n.client.js';

export function getUserPermissionLabel(
    i18nClient: Readonly<AppI18nClient>,
    userPermissionField: TeamPermissionField,
) {
    const labels: Record<TeamPermissionField, string> = {
        canManageUsers: i18nClient.get.userPermissionLabel.canManageUsers,
        canEditTeamDetails: i18nClient.get.userPermissionLabel.canEditTeamDetails,
    };

    return labels[userPermissionField];
}
