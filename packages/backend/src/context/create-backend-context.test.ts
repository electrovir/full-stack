import {HttpStatus} from '@augment-vir/common';
import {backendDefinitionShapes, EventLogName, type User} from '@evir/common';
import {type BackendClientInterface} from '@evir/common-backend';
import {defaultBackendConfig} from '@evir/common-backend/src/data/backend-config.js';
import {mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {describeEndpoint} from '../endpoints/test-endpoints.mock.js';

async function seedEventLogs(
    backendClientInterface: Readonly<Pick<BackendClientInterface, 'prismaClient'>>,
    userId: User['id'],
    count: number,
    eventName: EventLogName = EventLogName.AuthenticationEvent,
) {
    for (let i = 0; i < count; i++) {
        await backendClientInterface.prismaClient.eventLog.create({
            data: {
                eventName,
                userId,
            },
        });
    }
}

describeEndpoint(backendDefinitionShapes.endpoints['/user'], ({endpointCases}) => {
    endpointCases(
        {
            responseSelect: {
                emailAddress: true,
            },
        },
        [
            {
                it: 'allows requests when event log count is below the limit',
                input: async ({backendClientInterface}) => {
                    await seedEventLogs(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.eventLogMax.count - 1,
                    );

                    return {
                        authenticatedUserEmail: mockSeedUsers.adminUser.emailAddress,
                    };
                },
                expect: {
                    response: {
                        status: HttpStatus.Ok,
                        body: {
                            emailAddress: mockSeedUsers.adminUser.emailAddress,
                        },
                    },
                },
            },
            {
                it: 'rejects with TooManyRequests when event log count meets the limit',
                input: async ({backendClientInterface}) => {
                    await seedEventLogs(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.eventLogMax.count,
                    );

                    return {
                        authenticatedUserEmail: mockSeedUsers.adminUser.emailAddress,
                    };
                },
                expect: {
                    response: {
                        status: HttpStatus.TooManyRequests,
                    },
                },
            },
            {
                it: 'rejects with TooManyRequests when event log count exceeds the limit',
                input: async ({backendClientInterface}) => {
                    await seedEventLogs(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.eventLogMax.count + 5,
                    );

                    return {
                        authenticatedUserEmail: mockSeedUsers.adminUser.emailAddress,
                    };
                },
                expect: {
                    response: {
                        status: HttpStatus.TooManyRequests,
                    },
                },
            },
            {
                it: 'does not rate limit a different user',
                input: async ({backendClientInterface}) => {
                    /** Seed events for the admin user, well over the limit. */
                    await seedEventLogs(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.eventLogMax.count + 5,
                    );

                    return {
                        /** Authenticate as the customer user, who has no event logs. */
                        authenticatedUserEmail: mockSeedUsers.customerUser.emailAddress,
                    };
                },
                expect: {
                    response: {
                        status: HttpStatus.Ok,
                        body: {
                            emailAddress: mockSeedUsers.customerUser.emailAddress,
                        },
                    },
                },
            },
            {
                it: 'rate limits regardless of event log name',
                input: async ({backendClientInterface}) => {
                    const count = defaultBackendConfig.eventLogMax.count;
                    const half = Math.floor(count / 2);

                    await seedEventLogs(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        half,
                        EventLogName.AuthenticationEvent,
                    );
                    await seedEventLogs(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        count - half,
                        EventLogName.EmailSend,
                    );

                    return {
                        authenticatedUserEmail: mockSeedUsers.adminUser.emailAddress,
                    };
                },
                expect: {
                    response: {
                        status: HttpStatus.TooManyRequests,
                    },
                },
            },
        ],
    );
});
