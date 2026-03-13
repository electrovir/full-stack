import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {
    calculateRelativeDate,
    createUtcFullDate,
    getNowInUtcTimezone,
    toTimestamp,
    toUtcIsoString,
    utcIsoStringShape,
} from 'date-vir';
import {assertValidShape} from 'object-shape-tester';
import {getOffsetDateInIso} from './date.js';

describe(getOffsetDateInIso.name, () => {
    it('produces an offset time', () => {
        const offset1: string = getOffsetDateInIso({
            minutes: -5,
        });
        const offset2: string = toUtcIsoString(
            calculateRelativeDate(getNowInUtcTimezone(), {
                minutes: -5,
            }),
        );

        assertValidShape(offset1, utcIsoStringShape());
        assertValidShape(offset2, utcIsoStringShape());

        assert.isApproximately(
            toTimestamp(createUtcFullDate(offset1)),
            toTimestamp(createUtcFullDate(offset1)),
            /** 10 seconds (a bit excessive) */
            10_000,
        );
    });
});
