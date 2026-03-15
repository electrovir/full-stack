import {backendDefinitionShapes} from '@evir/common';
import {HttpStatus} from '@rest-vir/run-service';
import {describeEndpoint} from './test-endpoints.mock.js';

describeEndpoint(backendDefinitionShapes.endpoints['/sign-up'], ({endpointCases}) => {
    endpointCases({}, [
        {
            it: 'rejects weak password (too short)',
            input: {
                requestData: {
                    emailAddress: 'test@example.com',
                    password: 'weak',
                    info: {
                        humanName: 'Test User',
                        teamName: 'Test Team',
                    },
                },
            },
            expect: {
                response: {
                    status: HttpStatus.BadRequest,
                    body: 'too-short',
                },
            },
        },
        {
            it: 'rejects invalid email',
            input: {
                requestData: {
                    emailAddress: 'invalid-email',
                    password: 'ValidPassword123!',
                    info: {
                        humanName: 'Test User',
                        teamName: 'Test Team',
                    },
                },
            },
            expect: {
                response: {
                    status: HttpStatus.BadRequest,
                    body: 'Invalid email address.',
                },
            },
        },
    ]);
});
