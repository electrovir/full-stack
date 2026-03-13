import {
    type AnyDuration,
    type UtcIsoString,
    calculateRelativeDate,
    getNowInUtcTimezone,
    toUtcIsoString,
} from 'date-vir';

/** Easily get date and time offsets from the current time in the `UtcIsoString` format. */
export function getOffsetDateInIso(offset: Readonly<AnyDuration>): UtcIsoString {
    return toUtcIsoString(calculateRelativeDate(getNowInUtcTimezone(), offset));
}
