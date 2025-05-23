const {baseConfig} = require('@virmator/spellcheck/configs/cspell.config.base.cjs');

module.exports = {
    ...baseConfig,
    ignorePaths: [
        ...baseConfig.ignorePaths,
        'packages/database/src/generated/',
    ],
    words: [
        ...baseConfig.words,
        'pglite',
        'sesv2',
        'cuid',
        'dbname',
        'aesgcm',
    ],
};
