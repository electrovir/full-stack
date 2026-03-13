import {describe, itCases} from '@augment-vir/test';
import {calculateRelativeDate, createUtcFullDate, type FullDate} from 'date-vir';
import {bucketGraphDataByTime, TimeBucketAggregationOperation} from './graph-data.js';

type TestEntry = {
    date: FullDate;
    value: number;
    category?: string;
};
const fixedNow = createUtcFullDate('2026-01-15T12:00:00.000Z');

describe(bucketGraphDataByTime.name, () => {
    itCases(bucketGraphDataByTime<TestEntry>, [
        {
            it: 'returns empty data placeholder when no entries',
            input: {
                bucketAggregationOperation: TimeBucketAggregationOperation.Sum,
                bucketDuration: {
                    days: 1,
                },
                fullTimeSpan: {
                    days: 7,
                },
                dateLabelFormat: 'MM/dd',
                entries: [],
                getSeriesData() {
                    return {
                        seriesLabel: 'Test',
                        data: 1,
                        date: fixedNow,
                    };
                },
                nowOverride: fixedNow,
            },
            expect: {
                labels: [
                    '01/08',
                    '01/09',
                    '01/10',
                    '01/11',
                    '01/12',
                    '01/13',
                    '01/14',
                ],
                datasets: [
                    {
                        label: 'No data',
                        data: [
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                            0,
                        ],
                    },
                ],
            },
        },
        {
            it: 'places entry in correct bucket based on date',
            input: {
                bucketAggregationOperation: TimeBucketAggregationOperation.Sum,
                bucketDuration: {
                    days: 1,
                },
                fullTimeSpan: {
                    days: 3,
                },
                dateLabelFormat: 'MM/dd',
                entries: [
                    {
                        date: calculateRelativeDate(fixedNow, {
                            days: -1.5,
                        }),
                        value: 5,
                    },
                ],
                getSeriesData(entry) {
                    return {
                        seriesLabel: 'Series A',
                        data: entry.value,
                        date: entry.date,
                    };
                },
                nowOverride: fixedNow,
            },
            expect: {
                labels: [
                    '01/12',
                    '01/13',
                    '01/14',
                ],
                datasets: [
                    {
                        label: 'Series A',
                        data: [
                            0,
                            5,
                            0,
                        ],
                    },
                ],
            },
        },
        {
            it: 'aggregates multiple entries in the same bucket',
            input: {
                bucketAggregationOperation: TimeBucketAggregationOperation.Sum,
                bucketDuration: {
                    days: 1,
                },
                fullTimeSpan: {
                    days: 3,
                },
                dateLabelFormat: 'MM/dd',
                entries: [
                    {
                        date: calculateRelativeDate(fixedNow, {
                            hours: -20,
                        }),
                        value: 3,
                    },
                    {
                        date: calculateRelativeDate(fixedNow, {
                            hours: -10,
                        }),
                        value: 7,
                    },
                ],
                getSeriesData(entry) {
                    return {
                        seriesLabel: 'Totals',
                        data: entry.value,
                        date: entry.date,
                    };
                },
                nowOverride: fixedNow,
            },
            expect: {
                labels: [
                    '01/12',
                    '01/13',
                    '01/14',
                ],
                datasets: [
                    {
                        label: 'Totals',
                        data: [
                            0,
                            0,
                            10,
                        ],
                    },
                ],
            },
        },
        {
            it: 'separates entries into different series',
            input: {
                bucketAggregationOperation: TimeBucketAggregationOperation.Sum,
                bucketDuration: {
                    days: 1,
                },
                fullTimeSpan: {
                    days: 3,
                },
                dateLabelFormat: 'MM/dd',
                entries: [
                    {
                        date: calculateRelativeDate(fixedNow, {
                            days: -2.5,
                        }),
                        value: 5,
                        category: 'Apples',
                    },
                    {
                        date: calculateRelativeDate(fixedNow, {
                            days: -0.5,
                        }),
                        value: 3,
                        category: 'Oranges',
                    },
                ],
                getSeriesData(entry) {
                    return {
                        seriesLabel: entry.category || 'Unknown',
                        data: entry.value,
                        date: entry.date,
                    };
                },
                nowOverride: fixedNow,
            },
            expect: {
                labels: [
                    '01/12',
                    '01/13',
                    '01/14',
                ],
                datasets: [
                    {
                        label: 'Apples',
                        data: [
                            5,
                            0,
                            0,
                        ],
                    },
                    {
                        label: 'Oranges',
                        data: [
                            0,
                            0,
                            3,
                        ],
                    },
                ],
            },
        },
        {
            it: 'excludes entries outside the time span',
            input: {
                bucketAggregationOperation: TimeBucketAggregationOperation.Sum,
                bucketDuration: {
                    days: 1,
                },
                fullTimeSpan: {
                    days: 3,
                },
                dateLabelFormat: 'MM/dd',
                entries: [
                    {
                        date: calculateRelativeDate(fixedNow, {
                            days: -10,
                        }),
                        value: 100,
                    },
                    {
                        date: calculateRelativeDate(fixedNow, {
                            days: 5,
                        }),
                        value: 200,
                    },
                ],
                getSeriesData(entry) {
                    return {
                        seriesLabel: 'Out of Range',
                        data: entry.value,
                        date: entry.date,
                    };
                },
                nowOverride: fixedNow,
            },
            expect: {
                labels: [
                    '01/12',
                    '01/13',
                    '01/14',
                ],
                datasets: [
                    {
                        label: 'No data',
                        data: [
                            0,
                            0,
                            0,
                        ],
                    },
                ],
            },
        },
        {
            it: 'creates correct bucket count from duration ratio',
            input: {
                bucketAggregationOperation: TimeBucketAggregationOperation.Sum,
                bucketDuration: {
                    hours: 6,
                },
                fullTimeSpan: {
                    days: 1,
                },
                dateLabelFormat: 'HH:mm',
                entries: [],
                getSeriesData() {
                    return {
                        seriesLabel: 'Test',
                        data: 1,
                        date: fixedNow,
                    };
                },
                nowOverride: fixedNow,
            },
            expect: {
                labels: [
                    '12:00',
                    '18:00',
                    '00:00',
                    '06:00',
                ],
                datasets: [
                    {
                        label: 'No data',
                        data: [
                            0,
                            0,
                            0,
                            0,
                        ],
                    },
                ],
            },
        },
        {
            it: 'formats labels according to dateLabelFormat',
            input: {
                bucketAggregationOperation: TimeBucketAggregationOperation.Sum,
                bucketDuration: {
                    days: 1,
                },
                fullTimeSpan: {
                    days: 3,
                },
                dateLabelFormat: 'yyyy-MM-dd',
                entries: [],
                getSeriesData() {
                    return {
                        seriesLabel: 'Test',
                        data: 1,
                        date: fixedNow,
                    };
                },
                nowOverride: fixedNow,
            },
            expect: {
                labels: [
                    '2026-01-12',
                    '2026-01-13',
                    '2026-01-14',
                ],
                datasets: [
                    {
                        label: 'No data',
                        data: [
                            0,
                            0,
                            0,
                        ],
                    },
                ],
            },
        },
    ]);
});
