import {type Dimensions} from '@augment-vir/common';
import {ScreenSize} from './screen-size.js';

export const mockScreenDimensions: Record<ScreenSize, Dimensions> = {
    [ScreenSize.Desktop]: {
        width: 1920,
        height: 1080,
    },
    [ScreenSize.Tablet]: {
        width: 1300,
        height: 1000,
    },
    [ScreenSize.Phone]: {
        width: 300,
        height: 500,
    },
};
