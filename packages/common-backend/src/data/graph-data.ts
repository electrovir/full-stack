import {assert, check} from '@augment-vir/assert';
import {
    createArray,
    ensureArray,
    getOrSet,
    type MaybeArray,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {
    calculateRelativeDate,
    convertDuration,
    createUtcFullDate,
    getNowInUtcTimezone,
    toFormattedString,
    toTimestamp,
    type AnyDuration,
    type DateLike,
    type FullDate,
} from 'date-vir';

export type GraphSeriesData = {
    seriesLabel: string;
    data: number;
    date: DateLike;
};

export type GetSeriesDataCallback<T> = (
    entry: Readonly<T>,
) => MaybeArray<GraphSeriesData | undefined>;

export enum TimeBucketAggregationOperation {
    /** Sum all data points within the time bucket. */
    Sum = 'sum',
    /** Get the max of all data points within the time bucket. */
    Max = 'max',
}

export function bucketGraphDataByTime<const Entry>({
    bucketDuration,
    entries,
    fullTimeSpan,
    dateLabelFormat,
    getSeriesData,
    bucketAggregationOperation,
    nowOverride: now = getNowInUtcTimezone(),
}: Readonly<
    {
        /** See details here: https://moment.github.io/luxon/#/formatting?id=table-of-tokens */
        dateLabelFormat: string;
        entries: ReadonlyArray<Readonly<Entry>>;
        bucketDuration: Readonly<AnyDuration>;
        /** The full time span for these buckets to fill. */
        fullTimeSpan: Readonly<AnyDuration>;
        getSeriesData: GetSeriesDataCallback<Entry>;
        /** How data points that fall within the same time bucket are aggregated. */
        bucketAggregationOperation: TimeBucketAggregationOperation;
    } & PartialWithUndefined<{
        nowOverride: Readonly<FullDate>;
    }>
>) {
    const nowTimestamp = toTimestamp(now);
    const bucketDurationMs = convertDuration(bucketDuration, {
        milliseconds: true,
    }).milliseconds;
    const fullSpanMs = convertDuration(fullTimeSpan, {
        milliseconds: true,
    }).milliseconds;

    const bucketCount = Math.floor(fullSpanMs / bucketDurationMs);
    const startTimestamp = nowTimestamp - fullSpanMs;

    const dateBuckets = createArray(bucketCount, (index) => {
        const date = calculateRelativeDate(now, {
            milliseconds: -fullSpanMs + index * bucketDurationMs,
        });
        return toFormattedString(date, dateLabelFormat);
    });

    const allSeries = entries.reduce(
        (accum, entry) => {
            const seriesData = ensureArray(getSeriesData(entry)).filter(check.isTruthy);
            if (!seriesData.length) {
                return accum;
            }
            seriesData.forEach((seriesEntry) => {
                const eventTime = toTimestamp(createUtcFullDate(seriesEntry.date));
                const bucketIndex = Math.floor((eventTime - startTimestamp) / bucketDurationMs);

                if (bucketIndex < 0 || bucketIndex >= bucketCount) {
                    return;
                }

                const seriesArray = getOrSet(accum, seriesEntry.seriesLabel, () =>
                    createArray(dateBuckets.length, () => 0),
                );

                seriesArray[bucketIndex] = performBucketAggregation(
                    seriesArray[bucketIndex] || 0,
                    seriesEntry.data,
                    bucketAggregationOperation,
                );
            });

            return accum;
        },
        {} as Record<
            /** Series name. */
            string,
            /** Data points. */
            number[]
        >,
    );

    const allSeriesEntries = Object.entries(allSeries);

    return {
        /** X labels. */
        labels: dateBuckets,
        datasets:
            allSeriesEntries.length > 0
                ? allSeriesEntries.map(
                      ([
                          seriesLabel,
                          seriesData,
                      ]) => {
                          return {
                              label: seriesLabel,
                              data: seriesData,
                          };
                      },
                  )
                : [
                      {
                          label: 'No data',
                          data: dateBuckets.map(() => 0),
                      },
                  ],
    };
}

function performBucketAggregation(
    a: number,
    b: number,
    operation: TimeBucketAggregationOperation,
): number {
    if (operation === TimeBucketAggregationOperation.Max) {
        return Math.max(a, b);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (operation === TimeBucketAggregationOperation.Sum) {
        return a + b;
    } else {
        assert.tsType(operation).equals<never>();
        throw new Error(`Unsupported operation: ${String(operation)}`);
    }
}
