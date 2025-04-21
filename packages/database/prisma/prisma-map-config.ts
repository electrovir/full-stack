import {definePrismaMapConfig} from 'prisma-map';

export default definePrismaMapConfig({
    imports: [
        "import {UtcIsoString} from 'date-vir';",
        "import * as FrontendReady from '../frontend';",
    ],
    replacements: {
        outputs: [
            {
                match: /\bDate\s*\|\s*string\b/,
                replace: 'UtcIsoString',
            },
            {
                match: /\bstring\s*\|\s*Date\b/,
                replace: 'UtcIsoString',
            },
            {
                match: /\bDate\b/,
                replace: 'UtcIsoString',
            },
            {
                match: '$Enums.',
                replace: 'FrontendReady.',
            },
        ],
        inputs: [
            {
                match: '$Enums.',
                replace: 'FrontendReady.',
            },
        ],
    },
});
