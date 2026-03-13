/* eslint-disable sonarjs/no-hardcoded-passwords */

import {HttpStatus} from '@augment-vir/common';
import {backendDefinitionShapes} from '@evir/common';
import {describeEndpoint} from './test-endpoints.mock.js';

describeEndpoint(backendDefinitionShapes.endpoints['/sign-up'], ({endpointCases}) => {
    endpointCases({}, [
        {
            it: 'rejects empty password',
            input: {
                requestData: {
                    emailAddress: '',
                    info: {
                        humanName: '',
                        teamName: '',
                    },
                    password: '',
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
            it: 'rejects empty email',
            input: {
                requestData: {
                    emailAddress: '',
                    info: {
                        humanName: '',
                        teamName: '',
                    },
                    password: 'something',
                },
            },
            expect: {
                response: {
                    body: 'Invalid email address.',
                    status: HttpStatus.BadRequest,
                },
            },
        },
    ]);
});
