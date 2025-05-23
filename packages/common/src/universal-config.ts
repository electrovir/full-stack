export const defaultUniversalConfig = {
    password: {
        minLength: 15,
    },
    companyProperName: 'Full Stack',
    productionHost: 'example.com',
};

/** Config for both frontend and backend. */
export type UniversalConfig = typeof defaultUniversalConfig;
