import {PathTree} from 'spa-router-vir';

export const teamPathTree = {
    allowBare: false,
    children: {
        details: {},
        users: {
            allowBare: true,
            children: {
                user: {
                    allowBare: true,
                    children: {
                        ':user-id': {},
                    },
                },
                create: {},
            },
        },
    },
} as const;

export type TeamPathTab = keyof typeof teamPathTree.children;

export const frontendPathTree = new PathTree({
    allowBare: true,
    children: {
        app: {
            allowBare: true,
            children: {
                settings: {
                    allowBare: false,
                    children: {
                        user: {},
                        team: teamPathTree,
                    },
                },
                'internal-admin': {
                    allowBare: false,
                    children: {
                        teams: {
                            allowBare: true,
                            children: {
                                ':team-filter': {
                                    allowBare: true,
                                    children: {
                                        team: {
                                            allowBare: true,
                                            children: {
                                                ':team-id': teamPathTree,
                                            },
                                        },
                                        create: {},
                                    },
                                },
                            },
                        },
                        'dev-db': {},
                    },
                },
            },
        },
        verify: {},
        'create-account': {},
        'reset-password': {},
        'forgot-password': {},
        design: {
            anyChildren: true,
        },
        link: {
            allowBare: true,
            children: {
                ':link-id': {},
            },
        },
    },
});
