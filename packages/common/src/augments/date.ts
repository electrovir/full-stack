import {
    type AnyDuration,
    type UtcIsoString,
    calculateRelativeDate,
    getNowInUtcTimezone,
    toUtcIsoString,
} from 'date-vir';

/**
 * Easily get date and times offset from the current date and time in a format that Prisma client
 * will accept.
 */
export function getOffsetDbTime(offset: Readonly<AnyDuration>): UtcIsoString {
    return toUtcIsoString(calculateRelativeDate(getNowInUtcTimezone(), offset));
}
