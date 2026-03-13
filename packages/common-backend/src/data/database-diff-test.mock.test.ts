import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {ModelName} from '@evir/common';
import {createMockBackendClientInterface} from '../backend-client-interface/backend-client-interface.mock.js';
import {getDatabaseDiff} from './database-diff-test.mock.js';

describe(getDatabaseDiff.name, () => {
    it('calculates diff', async (testContext) => {
        const backendClientInterface = await createMockBackendClientInterface(testContext);

        const {dbDiff} = await getDatabaseDiff(backendClientInterface, undefined, async () => {
            await backendClientInterface.prismaClient.team.create({
                data: {
                    teamName: 'TEST',
                    isTeamApprovedByAdmin: true,
                },
                select: {
                    id: true,
                },
            });
        });

        assert.deepEquals(dbDiff, {
            added: {
                [ModelName.Team]: [
                    {
                        deactivatedAt: null,
                        isTeamApprovedByAdmin: true,
                        isInternalAdminTeam: false,
                        isTestTeam: false,
                        teamName: 'TEST',
                    },
                ],
            },
        });
    });
});
