import {type FrontendPaths} from '@evir/common';
import {type DeclarativeElementDefinition} from 'element-vir';
import {type FullyResolvedFrontendState} from './frontend-state.js';

export type CurrentModal = {
    element: DeclarativeElementDefinition;
    exitPaths: FrontendPaths;
};

export function getModal(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    frontendState: Readonly<FullyResolvedFrontendState>,
): undefined | CurrentModal {
    return undefined;
}
