const {baseConfig} = require('@virmator/spellcheck/configs/cspell.config.base.cjs');

module.exports = {
    ...baseConfig,
    ignorePaths: [
        ...baseConfig.ignorePaths,
        'packages/database/src/generated/',
        'packages/frontend/build-size.html',
    ],
    words: [
        ...baseConfig.words,
    ],
};
