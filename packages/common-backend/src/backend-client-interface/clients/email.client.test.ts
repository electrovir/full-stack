import {assert} from '@augment-vir/assert';
import {removeUndefinedValues, selectFrom} from '@augment-vir/common';
import {readJsonFile} from '@augment-vir/node';
import {describe, it} from '@augment-vir/test';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {createMockBackendClientInterface} from '../backend-client-interface.mock.js';
import {EmailClient, type SendEmailParams} from './email.client.js';

describe(EmailClient.name, () => {
    it('saves emails in dev', async (testContext) => {
        const {emailClient} = await createMockBackendClientInterface(testContext);

        const params: SendEmailParams = {
            subject: 'Test email',
            text: 'This is a test email and should not actually send.',
            relevantTeamId: undefined,
            relevantRequest: undefined as any,
            sentBecauseOf: {
                sentBecauseOfUserId: mockSeedUsers.adminUser.id,
            },
            toAddresses: [
                /**
                 * It doesn't matter what this email address is because in dev it won't actually
                 * send an email.
                 */
                'test@example.com',
            ],
        };

        const filePath = await emailClient.sendEmail(params);
        assert.isString(filePath, "Sending a dev email didn't return a file path.");

        const fileContents = await readJsonFile(filePath);

        assert.deepEquals(
            fileContents,
            removeUndefinedValues(
                selectFrom(params, {
                    html: true,
                    relevantTeamId: true,
                    sentBecauseOf: true,
                    subject: true,
                    text: true,
                    toAddresses: true,
                    toUsers: true,
                }),
            ),
        );
    });
});
