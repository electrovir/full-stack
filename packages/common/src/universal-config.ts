export const defaultUniversalConfig = {
    password: {
        minLength: 10,
    },
};

/** Config for both frontend and backend. */
export type UniversalConfig = typeof defaultUniversalConfig;
