import {check} from '@augment-vir/assert';
import {
    type ExtractKeysWithMatchingValues,
    type PartialWithNullable,
    type RequiredAndNotNull,
    type SelectFrom,
} from '@augment-vir/common';
import {AuthenticationOutcome, EmailCodeType, EventLogName, type EventLog} from '@evir/common';
import {checkValidShape, defineShape, enumShape, type Shape} from 'object-shape-tester';

export type EventLogAvailableRelations = RequiredAndNotNull<
    Pick<EventLog, Extract<keyof EventLog, `${string}Id`>>
>;

export const maybeRelation = 'maybe-relation';

export const eventLogDataShapes = {
    [EventLogName.UserFeedbackSent]: {
        data: defineShape({
            startUrl: '',
            submitUrl: '',
        }),
        relations: {
            userId: true,
            teamId: maybeRelation,
        },
    },
    [EventLogName.AuthenticationEvent]: {
        data: defineShape({
            /** The email address that was attempted. */
            emailAddress: '',
            /** The outcome of the authentication attempt. */
            outcome: enumShape(AuthenticationOutcome),
        }),
        relations: {
            /** Set if a matching active user was found. */
            userId: maybeRelation,
            teamId: maybeRelation,
        },
    },
    [EventLogName.EmailCodeSend]: {
        data: defineShape({
            emailAddress: '',
            codeType: enumShape(EmailCodeType),
        }),
        relations: {
            userId: true,
            teamId: maybeRelation,
            emailCodeId: true,
        },
    },
    [EventLogName.EmailCodeVerify]: {
        data: defineShape({
            emailAddress: '',
            codeType: enumShape(EmailCodeType),
        }),
        relations: {
            userId: true,
            teamId: maybeRelation,
            emailCodeId: true,
        },
    },
    [EventLogName.EmailCodeFailure]: {
        data: defineShape({
            reason: '',
            codeType: enumShape(EmailCodeType),
        }),
        relations: {
            userId: maybeRelation,
            teamId: maybeRelation,
            emailCodeId: maybeRelation,
        },
    },
    [EventLogName.EmailSend]: {
        data: defineShape({
            subject: '',
            recipientCount: 0,
        }),
        relations: {
            userId: maybeRelation,
            teamId: maybeRelation,
        },
    },
    [EventLogName.LinkOpen]: {
        data: defineShape({
            description: '',
        }),
        relations: {
            userId: true,
            teamId: maybeRelation,
            linkProxyId: true,
        },
    },
    [EventLogName.EmailChangeRequested]: {
        data: defineShape({
            newEmailAddress: '',
        }),
        relations: {
            userId: true,
            teamId: maybeRelation,
        },
    },
    [EventLogName.ResendVerificationCode]: {
        data: defineShape({
            codeType: enumShape(EmailCodeType),
            emailAddress: '',
        }),
        relations: {
            userId: true,
            teamId: true,
        },
    },
} satisfies Partial<
    Record<
        EventLogName,
        Partial<{
            data: Shape;
            relations: Partial<
                Record<keyof EventLogAvailableRelations, boolean | typeof maybeRelation>
            >;
        }>
    >
>;

export type EventLogRelations<Name extends EventLogName> =
    Name extends keyof typeof eventLogDataShapes
        ? SelectFrom<
              EventLogAvailableRelations,
              {
                  [Key in ExtractKeysWithMatchingValues<
                      (typeof eventLogDataShapes)[Name]['relations'],
                      true
                  >]: true;
              }
          > &
              PartialWithNullable<
                  SelectFrom<
                      EventLogAvailableRelations,
                      {
                          [Key in ExtractKeysWithMatchingValues<
                              (typeof eventLogDataShapes)[Name]['relations'],
                              typeof maybeRelation
                          >]: true;
                      }
                  >
              >
        : undefined;
export type EventLogData<Name extends EventLogName> = Name extends keyof typeof eventLogDataShapes
    ? 'data' extends keyof (typeof eventLogDataShapes)[Name]
        ? (typeof eventLogDataShapes)[Name]['data'] extends Shape
            ? (typeof eventLogDataShapes)[Name]['data']['runtimeType']
            : undefined
        : undefined
    : undefined;

export function isValidEventLog<
    const SpecificEvent extends Readonly<
        SelectFrom<
            EventLog,
            {
                extraData: true;
                eventName: true;
            }
        >
    >,
>(entry: SpecificEvent): boolean {
    if (check.isKeyOf(entry.eventName, eventLogDataShapes)) {
        const shapeRequirements = eventLogDataShapes[entry.eventName];

        if ('data' in shapeRequirements) {
            return checkValidShape(entry.extraData, shapeRequirements.data, {
                allowExtraKeys: true,
            });
        }
    }

    return entry.extraData == undefined;
}
