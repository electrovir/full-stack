/* eslint-disable @typescript-eslint/no-deprecated */

import {assert} from '@augment-vir/assert';
import {getObjectTypedEntries} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {
    determineScreenSize,
    getAllowedScreenSizes,
    ScreenSize,
    screenSizeWidthMax,
} from './screen-size.js';
import {mockScreenDimensions} from './screen-size.mock.js';

describe(getAllowedScreenSizes.name, () => {
    itCases(getAllowedScreenSizes, [
        {
            it: 'defaults to desktop',
            input: {
                elementWidth: 9000,
            },
            expect: {
                [ScreenSize.Desktop]: true,
                [ScreenSize.Tablet]: false,
                [ScreenSize.Phone]: false,
            },
        },
        {
            it: 'includes min size',
            input: {
                elementWidth: screenSizeWidthMax[ScreenSize.Tablet],
            },
            expect: {
                [ScreenSize.Desktop]: true,
                [ScreenSize.Tablet]: false,
                [ScreenSize.Phone]: false,
            },
        },
        {
            it: 'includes max size',
            input: {
                elementWidth: screenSizeWidthMax[ScreenSize.Tablet] - 1,
            },
            expect: {
                [ScreenSize.Desktop]: false,
                [ScreenSize.Tablet]: true,
                [ScreenSize.Phone]: false,
            },
        },
        {
            it: 'triggers tablet size',
            input: {
                elementWidth: screenSizeWidthMax[ScreenSize.Tablet] - 10,
            },
            expect: {
                [ScreenSize.Desktop]: false,
                [ScreenSize.Tablet]: true,
                [ScreenSize.Phone]: false,
            },
        },
        {
            it: 'triggers phone size',
            input: {
                elementWidth: screenSizeWidthMax[ScreenSize.Phone] - 10,
            },
            expect: {
                [ScreenSize.Desktop]: false,
                [ScreenSize.Tablet]: false,
                [ScreenSize.Phone]: true,
            },
        },
        {
            it: 'sticks with phone size till the end',
            input: {
                elementWidth: 0,
            },
            expect: {
                [ScreenSize.Desktop]: false,
                [ScreenSize.Tablet]: false,
                [ScreenSize.Phone]: true,
            },
        },
        {
            it: 'uses thresholds',
            input: {
                elementWidth: screenSizeWidthMax[ScreenSize.Phone],
                threshold: 20,
            },
            expect: {
                [ScreenSize.Desktop]: false,
                [ScreenSize.Phone]: true,
                [ScreenSize.Tablet]: true,
            },
        },
    ]);
});

describe(determineScreenSize.name, () => {
    itCases(determineScreenSize, [
        {
            it: 'gets desktop',
            input: {
                elementWidth: screenSizeWidthMax[ScreenSize.Tablet],
                currentScreenSize: undefined,
            },
            expect: ScreenSize.Desktop,
        },
        {
            it: 'keeps the same screen size if close',
            input: {
                elementWidth: screenSizeWidthMax[ScreenSize.Tablet],
                currentScreenSize: ScreenSize.Tablet,
            },
            expect: ScreenSize.Tablet,
        },
        {
            it: 'does not keep the same screen size if way off',
            input: {
                elementWidth: screenSizeWidthMax[ScreenSize.Tablet] + 10_000,
                currentScreenSize: ScreenSize.Tablet,
            },
            expect: ScreenSize.Desktop,
        },
        {
            it: 'gets tablet',
            input: {
                elementWidth: screenSizeWidthMax[ScreenSize.Phone],
                currentScreenSize: undefined,
            },
            expect: ScreenSize.Tablet,
        },
        {
            it: 'gets phone',
            input: {
                elementWidth: 0,
                currentScreenSize: undefined,
            },
            expect: ScreenSize.Phone,
        },
    ]);
});

describe('mockScreenDimensions', () => {
    it('fits within each size constraint', () => {
        const mockDimensionsArray = getObjectTypedEntries(mockScreenDimensions);

        assert.isLengthAtLeast(mockDimensionsArray, 1);

        mockDimensionsArray.forEach(
            ([
                screenSize,
                {width},
            ]) => {
                assert.strictEquals(
                    determineScreenSize({
                        currentScreenSize: undefined,
                        elementWidth: width,
                    }),
                    screenSize,
                    `Mock size for '${screenSize}' is not within that screen size: '${width}'`,
                );
            },
        );
    });
});
