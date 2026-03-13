import {assertWrap, check} from '@augment-vir/assert';
import {
    arrayToObject,
    getObjectTypedEntries,
    mapEnumToObject,
    type MinMax,
} from '@augment-vir/common';

export enum ScreenSize {
    Desktop = 'desktop',
    Tablet = 'tablet',
    Phone = 'phone',
}

/**
 * App widths smaller than the given number trigger that screen size, with the smallest screen size
 * taking priority.
 */
export const screenSizeWidthMax: Record<ScreenSize, number> = {
    [ScreenSize.Desktop]: Infinity,
    [ScreenSize.Tablet]: 1400,
    [ScreenSize.Phone]: 800,
};
const biggestToSmallestScreenSizes = getObjectTypedEntries(screenSizeWidthMax).sort(
    (
        [
            ,
            aWidth,
        ],
        [
            ,
            bWidth,
        ],
    ) => bWidth - aWidth,
);

const mappedScreenSizesWidths: Record<ScreenSize, MinMax> = arrayToObject(
    biggestToSmallestScreenSizes,
    (
        [
            screenSize,
            width,
        ],
        index,
        originalSortedScreenSizes,
    ) => {
        const nextSmallerSize = originalSortedScreenSizes[index + 1]?.[1] || 0;

        return {
            key: screenSize,
            value: {
                /** Min is inclusive. */
                min: nextSmallerSize,
                /** Max is exclusive. */
                max: width,
            },
        };
    },
    {
        useRequired: true,
    },
);

/** @deprecated: use {@link determineScreenSize} instead. */
export function getAllowedScreenSizes({
    elementWidth,
    threshold = 0,
}: {
    elementWidth: number;
    threshold?: number | undefined;
}): Record<ScreenSize, boolean> {
    const width = Math.abs(elementWidth);

    return mapEnumToObject(ScreenSize, (screenSize) => {
        const {min, max} = mappedScreenSizesWidths[screenSize];

        const matchesMax = check.isBelow(width, max + threshold);
        const matchesMin = check.isAtLeast(width, min - threshold);

        return matchesMax && matchesMin;
    });
}

/**
 * Determines what {@link ScreenSize} to used, based on the given `elementWidth`, and keeps
 * `currentScreenSize`, if provided, if it's close to the calculated {@link ScreenSize}.
 *
 * This sticks to `currentScreenSize` when close to prevent unnecessarily jarring UI updates,
 * especially on initial page load.
 */
export function determineScreenSize({
    currentScreenSize,
    elementWidth,
}: {
    currentScreenSize: undefined | ScreenSize;
    elementWidth: number;
}): ScreenSize {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const screenSizes = getAllowedScreenSizes({
        elementWidth,
        threshold: currentScreenSize ? 30 : 0,
    });

    if (currentScreenSize && screenSizes[currentScreenSize]) {
        return currentScreenSize;
    } else {
        return assertWrap.isDefined(
            biggestToSmallestScreenSizes.find(([screenSize]) => screenSizes[screenSize])?.[0],
            `Failed to find matching screen size for '${elementWidth}'`,
        );
    }
}
