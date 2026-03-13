import {check} from '@augment-vir/assert';
import {
    ensureErrorAndPrependMessage,
    log,
    mapObjectValues,
    replaceUndefinedValuesWithNull,
    stringify,
} from '@augment-vir/common';
import {DeployEnv, type EventLogCreateInput, type PrismaClient} from '@evir/common';
import {type ServerRequest} from '@rest-vir/implement-service';
import {type UtcIsoString} from 'date-vir';
import {handleError} from 'sentry-vir';
import {type IsEqual} from 'type-fest';
import {skip} from '../../../database-exports-for-backend.js';
import {type BackendEnvClient} from '../backend-env.client.js';
import {
    type EventLogData,
    type eventLogDataShapes,
    type EventLogRelations,
} from './event-log-shapes.js';

export type LogEventParams<Name extends keyof typeof eventLogDataShapes> = [
    (IsEqual<EventLogData<Name>, undefined> extends true
        ? {
              data?: undefined;
          }
        : {
              data: EventLogData<Name>;
          }) &
        (IsEqual<EventLogRelations<Name>, undefined> extends true
            ? {
                  relations?: undefined;
              }
            : {
                  relations: EventLogRelations<Name>;
              }) & {
            createdAtOverride?: UtcIsoString | undefined;
        },
];

function recursivelyReplaceUndefinedWithNull<T>(data: T): T {
    if (check.isObject(data)) {
        return mapObjectValues(data, (key, value) => {
            return recursivelyReplaceUndefinedWithNull(value);
        }) as T;
    } else {
        return (data ?? null) as T;
    }
}

export class EventLogClient {
    constructor(
        protected readonly clients: {
            backendEnvClient: Readonly<BackendEnvClient>;
            prismaClient: Readonly<PrismaClient>;
        },
    ) {}

    public async logEvent<const Name extends keyof typeof eventLogDataShapes>(
        eventName: Name,
        relevantRequest: ServerRequest | undefined,
        ...params: LogEventParams<Name>
    ) {
        const {data, relations, createdAtOverride} = params[0];

        try {
            const logData = {
                eventName,
                clientIp: relevantRequest?.ip || null,
                extraData: data ? recursivelyReplaceUndefinedWithNull(data) : skip,
                ...replaceUndefinedValuesWithNull(relations || {}),
                ...(check.isDefined(createdAtOverride)
                    ? {
                          createdAt: createdAtOverride,
                      }
                    : {}),
            } satisfies EventLogCreateInput;

            log.if(
                this.clients.backendEnvClient.deployEnv === DeployEnv.Dev &&
                    !this.clients.backendEnvClient.testName,
            ).faint(`LOG: ${stringify(logData, 4)}`);

            await this.clients.prismaClient.eventLog.create({
                data: logData,
                select: {
                    id: true,
                },
            });
        } catch (error) {
            handleError(ensureErrorAndPrependMessage(error, `Failed to log to ${eventName}`), {
                tags: {
                    ...relations,
                },
            });
        }
    }
}
