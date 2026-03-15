import {
    AuthenticationOutcome,
    backendDefinitionShapes,
    EventLogName,
    type User,
} from '@evir/common';
import {type BackendClientInterface} from '@evir/common-backend';
import {defaultBackendConfig} from '@evir/common-backend/src/data/backend-config.js';
import {mockSeedTeams, mockSeedUsers} from '@evir/common/src/data/dev-seed-data.mock.js';
import {HttpStatus} from '@rest-vir/run-service';
import {describeEndpoint} from './test-endpoints.mock.js';

async function seedFailedLoginEvents(
    backendClientInterface: Readonly<Pick<BackendClientInterface, 'prismaClient'>>,
    userId: User['id'],
    count: number,
) {
    for (let i = 0; i < count; i++) {
        await backendClientInterface.prismaClient.eventLog.create({
            data: {
                eventName: EventLogName.AuthenticationEvent,
                userId,
                extraData: {
                    emailAddress: mockSeedUsers.adminUser.emailAddress,
                    outcome: AuthenticationOutcome.FailedWrongPassword,
                },
            },
        });
    }
}

describeEndpoint(backendDefinitionShapes.endpoints['/login'], ({endpointCases}) => {
    endpointCases(
        {
            responseSelect: {
                emailAddress: true,
                isInternalAdmin: true,
            },
        },
        [
            {
                it: 'handles admin login',
                input: {
                    requestData: mockSeedUsers.adminUser,
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.LoginSuccess,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Ok,
                        body: {
                            emailAddress: mockSeedUsers.adminUser.emailAddress,
                            isInternalAdmin: true,
                        },
                    },
                },
            },
            {
                it: 'handles customer login',
                input: {
                    requestData: mockSeedUsers.customerUser,
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.customerUser.emailAddress,
                                        outcome: AuthenticationOutcome.LoginSuccess,
                                    },
                                    userId: mockSeedUsers.customerUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.customerTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Ok,
                        body: {
                            emailAddress: mockSeedUsers.customerUser.emailAddress,
                        },
                    },
                },
            },
            {
                it: 'handles XSS in email',
                input: {
                    requestData: {
                        emailAddress: '<script>alert("xss")</script>@example.com',
                        password: 'password',
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: '<script>alert("xss")</script>@example.com',
                                        outcome: AuthenticationOutcome.FailedInvalidEmail,
                                    },
                                    userId: null,
                                    linkProxyId: null,
                                    teamId: null,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'handles XSS in password',
                input: {
                    requestData: {
                        emailAddress: 'test@example.com',
                        password: '<script>alert("xss")</script>',
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: 'test@example.com',
                                        outcome: AuthenticationOutcome.FailedUserNotFound,
                                    },
                                    userId: null,
                                    linkProxyId: null,
                                    teamId: null,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'handles missing email',
                input: {
                    // @ts-expect-error: intentionally incorrect inputs
                    requestData: {
                        password: 'password',
                    },
                },
                expect: {
                    response: {
                        body: 'Invalid body.',
                        status: HttpStatus.BadRequest,
                    },
                },
            },
            {
                it: 'handles missing password',
                input: {
                    // @ts-expect-error: intentionally incorrect inputs
                    requestData: {
                        emailAddress: 'test@example.com',
                    },
                },
                expect: {
                    response: {
                        body: 'Invalid body.',
                        status: HttpStatus.BadRequest,
                    },
                },
            },
            {
                it: 'handles numeric email',
                input: {
                    requestData: {
                        // @ts-expect-error: intentionally incorrect inputs
                        emailAddress: 123,
                        password: 'password',
                    },
                },
                expect: {
                    response: {
                        body: 'Invalid body.',
                        status: HttpStatus.BadRequest,
                    },
                },
            },
            {
                it: 'handles numeric password',
                input: {
                    requestData: {
                        emailAddress: 'test@example.com',
                        // @ts-expect-error: intentionally incorrect inputs
                        password: 123,
                    },
                },
                expect: {
                    response: {
                        body: 'Invalid body.',
                        status: HttpStatus.BadRequest,
                    },
                },
            },
            {
                it: 'handles extra fields',
                input: {
                    requestData: {
                        emailAddress: 'test@example.com',
                        password: 'password',
                        // @ts-expect-error: intentionally incorrect inputs
                        extraField: '<script>alert("xss")</script>',
                        adminFlag: true,
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: 'test@example.com',
                                        outcome: AuthenticationOutcome.FailedUserNotFound,
                                    },
                                    userId: null,
                                    linkProxyId: null,
                                    teamId: null,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'handles null email',
                input: {
                    requestData: {
                        // @ts-expect-error: intentionally incorrect inputs
                        emailAddress: null,
                        password: 'password',
                    },
                },
                expect: {
                    response: {
                        body: 'Invalid body.',
                        status: HttpStatus.BadRequest,
                    },
                },
            },
            {
                it: 'handles null password',
                input: {
                    requestData: {
                        emailAddress: 'test@example.com',
                        // @ts-expect-error: intentionally incorrect inputs
                        password: null,
                    },
                },
                expect: {
                    response: {
                        body: 'Invalid body.',
                        status: HttpStatus.BadRequest,
                    },
                },
            },
            {
                it: 'handles undefined email',
                input: {
                    requestData: {
                        // @ts-expect-error: intentionally incorrect inputs
                        emailAddress: undefined,
                        password: 'password',
                    },
                },
                expect: {
                    response: {
                        body: 'Invalid body.',
                        status: HttpStatus.BadRequest,
                    },
                },
            },
            {
                it: 'handles undefined password',
                input: {
                    requestData: {
                        emailAddress: 'test@example.com',
                        // @ts-expect-error: intentionally incorrect inputs
                        password: undefined,
                    },
                },
                expect: {
                    response: {
                        body: 'Invalid body.',
                        status: HttpStatus.BadRequest,
                    },
                },
            },

            {
                it: 'ignores email address SQL injection drop tables',
                input: {
                    requestData: {
                        emailAddress: "'; DROP TABLE users; --",
                        password: 'password password 123',
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: "'; DROP TABLE users; --",
                                        outcome: AuthenticationOutcome.FailedInvalidEmail,
                                    },
                                    userId: null,
                                    linkProxyId: null,
                                    teamId: null,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'ignores email address SQL injection delete',
                input: {
                    requestData: {
                        emailAddress: "admin@example.com'; DELETE FROM users WHERE '1'='1",
                        password: 'password password 123',
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress:
                                            "admin@example.com'; DELETE FROM users WHERE '1'='1",
                                        outcome: AuthenticationOutcome.FailedInvalidEmail,
                                    },
                                    userId: null,
                                    linkProxyId: null,
                                    teamId: null,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'ignores email address SQL injection OR',
                input: {
                    requestData: {
                        emailAddress: "test@example.com' OR '1'='1' --",
                        password: 'password password 123',
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: "test@example.com' OR '1'='1' --",
                                        outcome: AuthenticationOutcome.FailedInvalidEmail,
                                    },
                                    userId: null,
                                    linkProxyId: null,
                                    teamId: null,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'ignores email address SQL injection select',
                input: {
                    requestData: {
                        emailAddress: "'; UNION SELECT * FROM users --",
                        password: 'password password 123',
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: "'; UNION SELECT * FROM users --",
                                        outcome: AuthenticationOutcome.FailedInvalidEmail,
                                    },
                                    userId: null,
                                    linkProxyId: null,
                                    teamId: null,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'ignores email address SQL injection insert',
                input: {
                    requestData: {
                        emailAddress:
                            "admin@example.com'; INSERT INTO users VALUES ('hacker', 'password'); --",
                        password: 'password password 123',
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress:
                                            "admin@example.com'; INSERT INTO users VALUES ('hacker', 'password'); --",
                                        outcome: AuthenticationOutcome.FailedInvalidEmail,
                                    },
                                    userId: null,
                                    linkProxyId: null,
                                    teamId: null,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },

            {
                it: 'ignores password SQL injection drop tables',
                input: {
                    requestData: {
                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                        password: "password'; DROP TABLE users; --",
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'ignores password SQL injection OR with --',
                input: {
                    requestData: {
                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                        password: "' OR '1'='1' --",
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'ignores password SQL injection select',
                input: {
                    requestData: {
                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                        password:
                            "'; UNION SELECT password FROM users WHERE email='admin@example.com' --",
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'ignores password SQL injection OR with #',
                input: {
                    requestData: {
                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                        password: "password' OR 1=1 #",
                    },
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },

            {
                it: 'locks account after reaching failed login attempt threshold',
                input: async ({backendClientInterface}) => {
                    await seedFailedLoginEvents(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.failedLoginLockoutCount - 1,
                    );

                    return {
                        requestData: {
                            emailAddress: mockSeedUsers.adminUser.emailAddress,
                            password: 'wrong password',
                        },
                    };
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.AccountLocked,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                            User: [
                                {},
                            ],
                        },
                        removed: {
                            User: [
                                {},
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Forbidden,
                    },
                },
            },
            {
                it: 'rejects login for already-locked account',
                input: async ({backendClientInterface}) => {
                    await backendClientInterface.prismaClient.user.update({
                        where: {
                            id: mockSeedUsers.adminUser.id,
                        },
                        data: {
                            accountLockedAt: '2025-12-25T00:00:00.000Z',
                        },
                    });

                    return {
                        requestData: {
                            emailAddress: mockSeedUsers.adminUser.emailAddress,
                            password: mockSeedUsers.adminUser.password,
                        },
                    };
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.AccountLocked,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'rejects already-locked account even with wrong password',
                input: async ({backendClientInterface}) => {
                    await backendClientInterface.prismaClient.user.update({
                        where: {
                            id: mockSeedUsers.adminUser.id,
                        },
                        data: {
                            accountLockedAt: '2025-12-25T00:00:00.000Z',
                        },
                    });

                    return {
                        requestData: {
                            emailAddress: mockSeedUsers.adminUser.emailAddress,
                            password: 'wrong password',
                        },
                    };
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.AccountLocked,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'does not lock account below the threshold',
                input: async ({backendClientInterface}) => {
                    await seedFailedLoginEvents(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.failedLoginLockoutCount - 2,
                    );

                    return {
                        requestData: {
                            emailAddress: mockSeedUsers.adminUser.emailAddress,
                            password: 'wrong password',
                        },
                    };
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'resets lockout counter after a successful login',
                input: async ({backendClientInterface}) => {
                    await seedFailedLoginEvents(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.failedLoginLockoutCount - 2,
                    );

                    /** Seed a successful login event to break the consecutive failure chain. */
                    await backendClientInterface.prismaClient.eventLog.create({
                        data: {
                            eventName: EventLogName.AuthenticationEvent,
                            userId: mockSeedUsers.adminUser.id,
                            extraData: {
                                emailAddress: mockSeedUsers.adminUser.emailAddress,
                                outcome: AuthenticationOutcome.LoginSuccess,
                            },
                        },
                    });

                    /**
                     * Add more failures, but not enough to reach the threshold since the counter
                     * resets after the successful login above.
                     */
                    await seedFailedLoginEvents(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.failedLoginLockoutCount - 2,
                    );

                    return {
                        requestData: {
                            emailAddress: mockSeedUsers.adminUser.emailAddress,
                            password: 'wrong password',
                        },
                    };
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'sets accountLockedAt in the database when locking',
                input: async ({backendClientInterface}) => {
                    await seedFailedLoginEvents(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.failedLoginLockoutCount - 1,
                    );

                    return {
                        requestData: {
                            emailAddress: mockSeedUsers.adminUser.emailAddress,
                            password: 'wrong password',
                        },
                        async after() {
                            const user =
                                await backendClientInterface.prismaClient.user.findFirstOrThrow({
                                    where: {
                                        id: mockSeedUsers.adminUser.id,
                                    },
                                    select: {
                                        accountLockedAt: true,
                                    },
                                });

                            return {
                                isLocked: user.accountLockedAt != null,
                            };
                        },
                    };
                },
                expect: {
                    afterResult: {
                        isLocked: true,
                    },
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.AccountLocked,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                            User: [
                                {},
                            ],
                        },
                        removed: {
                            User: [
                                {},
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Forbidden,
                    },
                },
            },
            {
                it: 'does not lock a different user when one user hits the threshold',
                input: async ({backendClientInterface}) => {
                    /** Seed failures for the admin user, enough to trigger lockout. */
                    await seedFailedLoginEvents(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.failedLoginLockoutCount,
                    );

                    return {
                        requestData: {
                            emailAddress: mockSeedUsers.customerUser.emailAddress,
                            password: 'wrong password',
                        },
                        async after() {
                            const customer =
                                await backendClientInterface.prismaClient.user.findFirstOrThrow({
                                    where: {
                                        id: mockSeedUsers.customerUser.id,
                                    },
                                    select: {
                                        accountLockedAt: true,
                                    },
                                });

                            return {
                                isLocked: customer.accountLockedAt != null,
                            };
                        },
                    };
                },
                expect: {
                    afterResult: {
                        isLocked: false,
                    },
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.customerUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.customerUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.customerTeam.id,
                                },
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Unauthorized,
                    },
                },
            },
            {
                it: 'locks account at exactly the threshold count',
                input: async ({backendClientInterface}) => {
                    /**
                     * Seed exactly threshold - 1 failures. The login attempt itself will be the Nth
                     * failure, reaching exactly the threshold.
                     */
                    await seedFailedLoginEvents(
                        backendClientInterface,
                        mockSeedUsers.adminUser.id,
                        defaultBackendConfig.failedLoginLockoutCount - 1,
                    );

                    return {
                        requestData: {
                            emailAddress: mockSeedUsers.adminUser.emailAddress,
                            password: 'wrong password',
                        },
                    };
                },
                expect: {
                    dataDiff: {
                        added: {
                            EventLog: [
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.AccountLocked,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                                {
                                    eventName: EventLogName.AuthenticationEvent,
                                    extraData: {
                                        emailAddress: mockSeedUsers.adminUser.emailAddress,
                                        outcome: AuthenticationOutcome.FailedWrongPassword,
                                    },
                                    userId: mockSeedUsers.adminUser.id,
                                    linkProxyId: null,
                                    teamId: mockSeedTeams.adminTeam.id,
                                },
                            ],
                            User: [
                                {},
                            ],
                        },
                        removed: {
                            User: [
                                {},
                            ],
                        },
                    },
                    response: {
                        status: HttpStatus.Forbidden,
                    },
                },
            },
        ],
    );
});
