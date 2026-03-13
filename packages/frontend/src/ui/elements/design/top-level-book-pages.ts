import {defineBookPage} from 'element-book';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';

export type DesignGlobals = {
    frontendState: Readonly<FrontendState>;
};

export const elementsBookPage = defineBookPage<DesignGlobals>({
    parent: undefined,
    title: 'Elements',
});

export const stylesBookPage = defineBookPage<DesignGlobals>({
    parent: undefined,
    title: 'Styles',
});
