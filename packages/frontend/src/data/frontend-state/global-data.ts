import {type AnyObject} from '@augment-vir/common';
import {type DeployEnv} from '@evir/common';
import {
    assertValidShape,
    defineShape,
    nonEmptyStringShape,
    nullableShape,
} from 'object-shape-tester';

const globalConfigShape = defineShape({
    release: nonEmptyStringShape(),
    backendPort: nullableShape(-1),
});
export type InjectedGlobalData = typeof globalConfigShape.runtimeType;
declare const VITE_INJECTED_DATA: InjectedGlobalData;

export function readInjectedGlobalData(): InjectedGlobalData {
    if (typeof VITE_INJECTED_DATA === 'undefined') {
        return {
            release: '',
            backendPort: undefined,
        };
    }

    const globalConfig: InjectedGlobalData = VITE_INJECTED_DATA;
    assertValidShape(globalConfig, globalConfigShape);

    return globalConfig;
}

export type GlobalData = {
    release: string;
    deployEnv: DeployEnv;
};

export function setGlobalData(globalData: GlobalData) {
    (globalThis as AnyObject).APP = globalData;
}
