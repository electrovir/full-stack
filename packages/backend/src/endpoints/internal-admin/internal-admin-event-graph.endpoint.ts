import {ensureArray, type MaybeArray, type SelectFrom} from '@augment-vir/common';
import {
    getOffsetDateInIso,
    SortOrder,
    type BackendService,
    type EventLogName,
    type JsonValue,
} from '@evir/common';
import {
    bucketGraphDataByTime,
    isValidEventLog,
    TimeBucketAggregationOperation,
    type EventLogData,
    type GraphSeriesData,
} from '@evir/common-backend';
import {
    HttpStatus,
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {hasAuthenticatedUser, type BackendContext} from '../../context/create-backend-context.js';

type AdminEventGraphResponse =
    BackendService['endpoints']['/internal-admin/event-graph']['ResponseType'];

export async function internalAdminEventGraphEndpoint(
    this: void,
    {
        context,
        requestData,
    }: EndpointImplementationParams<
        BackendContext,
        BackendService['endpoints']['/internal-admin/event-graph']
    >,
): Promise<EndpointImplementationOutput<AdminEventGraphResponse>> {
    if (!hasAuthenticatedUser(context)) {
        return {
            statusCode: HttpStatus.Unauthorized,
        };
    } else if (!context.authenticatedUser.isInternalAdmin) {
        return {
            statusCode: HttpStatus.Forbidden,
        };
    }

    if (requestData.team.allTeams) {
        /** Get all event logs for the specified event name in the past 7 days. */
        const allTeamEventLogs = await context.prismaClient.eventLog.findMany({
            where: {
                eventName: requestData.eventName,
                createdAt: {
                    gte: getOffsetDateInIso({
                        days: -7,
                    }),
                },
                teamId: {
                    not: null,
                },
            },
            select: {
                createdAt: true,
                team: {
                    select: {
                        teamName: true,
                    },
                },
            },
            orderBy: {
                createdAt: SortOrder.asc,
            },
        });

        return {
            statusCode: HttpStatus.Ok,
            responseData: bucketGraphDataByTime({
                bucketDuration: {
                    hours: 1,
                },
                bucketAggregationOperation: TimeBucketAggregationOperation.Sum,
                dateLabelFormat: 'EEE HH:00',
                entries: allTeamEventLogs,
                fullTimeSpan: {
                    days: 7,
                },
                getSeriesData(eventLog) {
                    if (!eventLog.team) {
                        return undefined;
                    }

                    return {
                        seriesLabel: eventLog.team.teamName,
                        data: 1,
                        date: eventLog.createdAt,
                    };
                },
            }),
        };
    } else {
        const singleTeamEventLogs = await context.prismaClient.eventLog.findMany({
            where: {
                eventName: requestData.eventName,
                createdAt: {
                    gte: getOffsetDateInIso({
                        days: -1,
                    }),
                },
                teamId: requestData.team.teamId,
            },
            select: {
                eventName: true,
                createdAt: true,
                teamId: true,
                extraData: true,
            },
            orderBy: {
                createdAt: SortOrder.asc,
            },
        });

        return {
            statusCode: HttpStatus.Ok,
            responseData: bucketGraphDataByTime({
                bucketDuration: {
                    minutes: 30,
                },
                bucketAggregationOperation: TimeBucketAggregationOperation.Max,
                dateLabelFormat: 'HH:mm ZZZZ',
                entries: singleTeamEventLogs,
                fullTimeSpan: {
                    days: 1,
                },
                getSeriesData(eventLog) {
                    const extraDataMapper = extraEventLogDataMappers[eventLog.eventName];

                    const mappedExtraData = isValidEventLog(eventLog)
                        ? extraDataMapper?.(eventLog.extraData)
                        : undefined;

                    if (mappedExtraData) {
                        return ensureArray(mappedExtraData).map((mapped) => {
                            if (!mapped) {
                                return mapped;
                            }

                            return {
                                ...mapped,
                                date: eventLog.createdAt,
                            };
                        });
                    } else {
                        return {
                            seriesLabel: eventLog.eventName,
                            data: 1,
                            date: eventLog.createdAt,
                        };
                    }
                },
            }),
        };
    }
}

const extraEventLogDataMappers = {} satisfies Partial<{
    [Key in EventLogName]: (entry: EventLogData<Key>) => MaybeArray<
        | SelectFrom<
              GraphSeriesData,
              {
                  data: true;
                  seriesLabel: true;
              }
          >
        | undefined
    >;
}> as Partial<{
    [Key in EventLogName]: (entry: JsonValue) => MaybeArray<
        | SelectFrom<
              GraphSeriesData,
              {
                  data: true;
                  seriesLabel: true;
              }
          >
        | undefined
    >;
}>;
