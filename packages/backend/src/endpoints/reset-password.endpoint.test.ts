import {AuthenticationOutcome, backendDefinitionShapes, EventLogName} from '@evir/common';
import {HttpStatus} from '@rest-vir/run-service';
import {describeEndpoint} from './test-endpoints.mock.js';

describeEndpoint(backendDefinitionShapes.endpoints['/reset-password'], ({endpointCases}) => {
    endpointCases({}, [
        {
            it: 'handles valid email',
            input: {
                requestData: {
                    emailAddress: 'test@example.com',
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
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles admin email enumeration attempt',
            input: {
                requestData: {
                    emailAddress: 'bad-admin@example.com',
                },
            },
            expect: {
                dataDiff: {
                    added: {
                        EventLog: [
                            {
                                eventName: EventLogName.AuthenticationEvent,
                                extraData: {
                                    emailAddress: 'bad-admin@example.com',
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
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles root email enumeration attempt',
            input: {
                requestData: {
                    emailAddress: 'root@example.com',
                },
            },
            expect: {
                dataDiff: {
                    added: {
                        EventLog: [
                            {
                                eventName: EventLogName.AuthenticationEvent,
                                extraData: {
                                    emailAddress: 'root@example.com',
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
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles email header injection',
            input: {
                requestData: {
                    emailAddress: `test@example.com\r
To: victim@example.com\r
Subject: Phishing`,
                },
            },
            expect: {
                response: {
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles multiple emails',
            input: {
                requestData: {
                    emailAddress: 'test@example.com,victim@example.com',
                },
            },
            expect: {
                response: {
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles very long email',
            input: {
                requestData: {
                    emailAddress: 'a'.repeat(1000) + '@example.com',
                },
            },
            expect: {
                response: {
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles international domain names',
            input: {
                requestData: {
                    // cspell:word экземпляр
                    emailAddress: 'test@экземпляр.com',
                },
            },
            expect: {
                dataDiff: {
                    added: {
                        EventLog: [
                            {
                                eventName: EventLogName.AuthenticationEvent,
                                extraData: {
                                    // cspell:word экземпляр
                                    emailAddress: 'test@экземпляр.com',
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
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles homograph attack',
            input: {
                requestData: {
                    emailAddress: 'test@exampIe.com',
                },
            },
            expect: {
                dataDiff: {
                    added: {
                        EventLog: [
                            {
                                eventName: EventLogName.AuthenticationEvent,
                                extraData: {
                                    emailAddress: 'test@exampie.com',
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
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles SQL injection in email',
            input: {
                requestData: {
                    emailAddress: "'; DROP TABLE users; --",
                },
            },
            expect: {
                response: {
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles XSS in email',
            input: {
                requestData: {
                    emailAddress: '<script>alert("xss")</script>@example.com',
                },
            },
            expect: {
                response: {
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles empty email',
            input: {
                requestData: {
                    emailAddress: '',
                },
            },
            expect: {
                response: {
                    status: HttpStatus.Ok,
                },
            },
        },
        {
            it: 'handles invalid email format',
            input: {
                requestData: {
                    emailAddress: 'not-an-email',
                },
            },
            expect: {
                response: {
                    status: HttpStatus.Ok,
                },
            },
        },
    ]);
});
