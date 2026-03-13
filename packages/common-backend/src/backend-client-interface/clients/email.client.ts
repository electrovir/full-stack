import {assert, assertWrap, check} from '@augment-vir/assert';
import {
    ensureErrorAndPrependMessage,
    log,
    makeWritable,
    randomString,
    sanitizeFileName,
    selectFrom,
    setFirstLetterCasing,
    StringCase,
    stringify,
    type PartialWithUndefined,
    type SelectFrom,
    type SetRequiredAndNotNull,
} from '@augment-vir/common';
import {writeJsonFile} from '@augment-vir/node';
import {
    DeployEnv,
    EmailCodeType,
    EventLogName,
    frontendPathTree,
    getOffsetDateInIso,
    testNameSearchParamKey,
    type EmailCode,
    type EmailLog,
    type FrontendSearchParams,
    type PrismaClient,
    type Team,
    type User,
} from '@evir/common';
import {type ServerRequest} from '@rest-vir/implement-service';
import {hashPassword} from 'auth-vir';
import {getNowInIsoString, negateDuration, toRelativeString} from 'date-vir';
import type Mailgun from 'mailgun.js';
import {mkdirSync, rmSync} from 'node:fs';
import {join, relative} from 'node:path';
import {handleError, throwWithExtraContext} from 'sentry-vir';
import {type RequireAtLeastOne, type RequireExactlyOne} from 'type-fest';
import {buildUrl} from 'url-vir';
import {devEmailsDirPath} from '../../data/file-paths.js';
import {type BackendEnvClient} from './backend-env.client.js';
import {type BackendSecretsClient} from './backend-secrets.client.js';
import {type EventLogClient} from './event-log-client/event-log.client.js';

export type DevEmailFile = Readonly<SetRequiredAndNotNull<SendEmailParams, 'toAddresses'>>;

export type EmailLogSentBecauseOfIds = Extract<keyof EmailLog, `sentBecauseOf${string}Id`>;

export type SendEmailParams = Readonly<
    RequireExactlyOne<{
        toAddresses: ReadonlyArray<string>;
        toUsers: ReadonlyArray<User['id']>;
    }> & {
        /** Raw text version of the email for clients that do not support fancy HTML emails. */
        text: string;
        relevantRequest: ServerRequest | undefined;
        subject: string;
        sentBecauseOf: Readonly<RequireAtLeastOne<Pick<EmailLog, EmailLogSentBecauseOfIds>>>;
        relevantTeamId: Team['id'] | undefined;
    } & PartialWithUndefined<{
            /** If HTML is not provided, `text` will be used instead. */
            html: string;
        }>
>;

type MailgunClient = ReturnType<Mailgun['client']>;

export class EmailClient {
    protected mailgunClient: MailgunClient | undefined;
    protected readonly fromAddress: string;
    protected readonly devPath: string | undefined;

    constructor(
        protected readonly clients: Readonly<{
            prismaClient: Readonly<PrismaClient>;
            backendSecretsClient: Readonly<BackendSecretsClient>;
            backendEnvClient: Readonly<BackendEnvClient>;
            eventLogClient: Readonly<EventLogClient>;
        }>,
    ) {
        this.devPath = createDevEmailPath(
            this.clients.backendEnvClient.deployEnv,
            this.clients.backendEnvClient.testName,
        );

        if (this.devPath) {
            rmSync(this.devPath, {
                recursive: true,
                force: true,
            });
            mkdirSync(this.devPath, {
                recursive: true,
            });
        }

        const fromName: string = [
            this.clients.backendEnvClient.universalConfig.companyProperName,
            this.clients.backendEnvClient.deployEnv === DeployEnv.Prod
                ? ''
                : setFirstLetterCasing(this.clients.backendEnvClient.deployEnv, StringCase.Upper),
        ]
            .filter(check.isTruthy)
            .join(' ');

        this.fromAddress = [
            `"${fromName}"`,
            `<${this.clients.backendEnvClient.backendConfig.fromEmailAddress[this.clients.backendEnvClient.deployEnv]}>`,
        ].join(' ');
    }

    protected async getMailgunClient(): Promise<MailgunClient> {
        if (!this.mailgunClient) {
            const Mailgun = (await import('mailgun.js')).default;

            assert.isTruthy(
                this.clients.backendSecretsClient.get.mailgun.keySecret,
                'Cannot send email: Mailgun API key is empty.',
            );

            this.mailgunClient = new Mailgun(FormData).client({
                username: 'api',
                key: this.clients.backendSecretsClient.get.mailgun.keySecret,
            });
        }

        return this.mailgunClient;
    }

    /** @returns The file path that the email was saved to. */
    protected async handleDevEmail(
        toAddresses: ReadonlyArray<string>,
        params: Readonly<SendEmailParams>,
    ) {
        assert.isTruthy(this.devPath, 'Cannot handle a dev email without a dev email path.');
        log.mutate(params.text);

        const fileName =
            assertWrap.isTruthy(
                sanitizeFileName(
                    [
                        ...toAddresses,
                        Date.now(),
                    ].join('_'),
                ),
            ) + '.json';
        const devEmailFilePath = join(this.devPath, fileName);

        const devEmailFile: DevEmailFile = {
            ...params,
            toAddresses,
        };

        await writeJsonFile(
            devEmailFilePath,
            selectFrom(devEmailFile, {
                html: true,
                relevantTeamId: true,
                sentBecauseOf: true,
                subject: true,
                text: true,
                toAddresses: true,
                toUsers: true,
            }),
        );
        log.info(`Email written to ${relative(process.cwd(), devEmailFilePath)}`);

        return devEmailFilePath;
    }

    /**
     * @returns
     *
     *   - A file path: if in dev and the email was saved to a file (returns the file path it was saved
     *       to)
     *   - `undefined`: when not in dev
     */
    public async sendEmail(params: Readonly<SendEmailParams>): Promise<string | undefined> {
        const toAddresses =
            params.toAddresses ||
            (
                await this.clients.prismaClient.user.findMany({
                    where: {
                        id: {
                            in: makeWritable(params.toUsers),
                        },
                        deactivatedAt: null,
                    },
                    select: {
                        emailAddress: true,
                    },
                })
            ).map((entry) => entry.emailAddress);

        if (this.clients.backendEnvClient.deployEnv === DeployEnv.Dev) {
            return await this.handleDevEmail(toAddresses, params);
        }

        try {
            await (
                await this.getMailgunClient()
            ).messages.create(this.clients.backendEnvClient.backendConfig.mailFromDomain, {
                to: makeWritable(toAddresses),
                from: this.fromAddress,
                subject: params.subject,
                html: params.html || params.text,
                text: params.text,
            });

            try {
                await this.clients.prismaClient.emailLog.create({
                    data: {
                        sentToEmailAddresses: toAddresses,
                        sentToUsers: {
                            connect: (params.toUsers || []).map((userId) => ({
                                id: userId,
                            })),
                        },
                        sentFromEmailAddress: this.fromAddress,
                        relevantTeamId: params.relevantTeamId || null,
                        subject: params.subject,
                        ...params.sentBecauseOf,
                    },
                });
            } catch (error) {
                handleError(
                    ensureErrorAndPrependMessage(
                        error,
                        'Failed to file EmailLog after sending email',
                    ),
                    {
                        context: selectFrom(params, {
                            relevantTeamId: true,
                            sentBecauseOf: true,
                            subject: true,
                            toAddresses: true,
                            toUsers: true,
                        }),
                        tags: {
                            teamId: params.relevantTeamId,
                            userId: params.sentBecauseOf.sentBecauseOfUserId,
                            emailCodeId: params.sentBecauseOf.sentBecauseOfEmailCodeId,
                        },
                    },
                );
            }

            await this.clients.eventLogClient.logEvent(EventLogName.EmailSend, undefined, {
                data: {
                    subject: params.subject,
                    recipientCount: toAddresses.length,
                },
                relations: {
                    userId: params.sentBecauseOf.sentBecauseOfUserId || null,
                    teamId: params.relevantTeamId || null,
                },
            });
        } catch (error) {
            throwWithExtraContext(
                ensureErrorAndPrependMessage(error, 'Failed to send email via Mailgun.'),
                {
                    context: {
                        email: selectFrom(params, {
                            subject: true,
                        }),
                        toAddresses,
                        fromAddress: this.fromAddress,
                        domain: this.clients.backendEnvClient.backendConfig.mailFromDomain,
                    },
                    tags: {
                        teamId: params.relevantTeamId,
                        userId: params.sentBecauseOf.sentBecauseOfUserId,
                        emailCodeId: params.sentBecauseOf.sentBecauseOfEmailCodeId,
                    },
                },
            );
        }

        return undefined;
    }

    /**
     * Clears all verification codes for the given user of the given code type that:
     *
     * 1. Have not been used
     * 2. Have not already been cleared
     */
    public async clearVerificationCodes(
        params: Readonly<
            RequireExactlyOne<{
                byUser: Readonly<{
                    codeType: EmailCodeType;
                    userId: User['id'];
                }>;
                byCodeId: EmailCode['id'];
            }>
        >,
    ) {
        const now = getNowInIsoString();

        if (params.byUser) {
            const result = await this.clients.prismaClient.emailCode.updateMany({
                where: {
                    userId: params.byUser.userId,
                    codeType: params.byUser.codeType,
                    usedAt: null,
                    deactivatedAt: null,
                },
                data: {
                    deactivatedAt: now,
                },
            });

            log.info(`Cleared ${result.count} email codes for: ${stringify(params.byUser)}`);
        } else if (params.byCodeId) {
            await this.clients.prismaClient.emailCode.update({
                where: {
                    id: params.byCodeId,
                    usedAt: null,
                    deactivatedAt: null,
                },
                data: {
                    deactivatedAt: now,
                },
            });
            log.info(`Cleared email code by id ${params.byCodeId}`);
        }
    }

    /** Emails a verification code to the user. */
    public async sendVerificationCode({
        relevantTeam,
        codeForUser,
        codeType,
        toEmailAddress,
        request,
    }: {
        /**
         * Used to extract the origin from the user's request (only used in dev) and requester's IP
         * address.
         */
        request: ServerRequest;
        /** The user from whom the code is to be created. */
        codeForUser: Readonly<SelectFrom<User, {id: true; humanName: true}>>;
        relevantTeam: Readonly<SelectFrom<Team, {id: true; teamName: true}>> | undefined;
        toEmailAddress: string;
        codeType: EmailCodeType;
    }): Promise<boolean> {
        const existingVerificationCode = await this.clients.prismaClient.emailCode.findFirst({
            /**
             * This intentionally does not depend on the `codeHasBeenUsed` field because even if
             * there is an existing code that has been used, we still want to rate limit codes of
             * the same type.
             */
            where: {
                userId: codeForUser.id,
                createdAt: {
                    gte: getOffsetDateInIso(
                        negateDuration(
                            this.clients.backendEnvClient.universalConfig.emailCodeDuration[
                                codeType
                            ].overlap,
                        ),
                    ),
                },
                codeType,
            },
            select: {
                id: true,
            },
        });

        if (existingVerificationCode) {
            handleError(
                new Error(
                    `Did not send verification code to email '${toEmailAddress}', an existing '${codeType}' code already exists.`,
                ),
                {
                    context: {
                        toEmailAddress,
                        codeType,
                        codeId: existingVerificationCode.id,
                    },
                    tags: {
                        userId: codeForUser.id,
                        teamId: relevantTeam?.id,
                        emailCodeId: existingVerificationCode.id,
                    },
                },
            );
            /** Don't send a new code if there's an existing valid one of the same type. */
            return false;
        }

        const verificationCode = randomString(60);

        const hashedVerificationCode = await hashPassword(verificationCode);

        const newVerificationCode = await this.clients.prismaClient.emailCode.create({
            data: {
                code: hashedVerificationCode,
                userId: codeForUser.id,
                codeType,
                emailAddress: toEmailAddress,
                ...(codeType === EmailCodeType.UserInvitation && relevantTeam
                    ? {
                          invitedToTeamId: relevantTeam.id,
                      }
                    : {}),
            },
        });

        const verificationOrigin: string =
            this.clients.backendEnvClient.deployEnv === DeployEnv.Dev
                ? request.headers.origin || ''
                : this.clients.backendEnvClient.backendConfig.clientOrigin[
                      this.clients.backendEnvClient.deployEnv
                  ];

        const verificationUrl = buildUrl(verificationOrigin, {
            paths: [
                frontendPathTree.paths.children.verify.path,
            ],
            search: {
                ...(this.clients.backendEnvClient.testName
                    ? {
                          [testNameSearchParamKey]: [this.clients.backendEnvClient.testName],
                      }
                    : {}),
                id: [newVerificationCode.id],
                code: [verificationCode],
                type: [codeType],
            } satisfies FrontendSearchParams,
        }).href;

        const timeoutDurationString = toRelativeString(
            this.clients.backendEnvClient.universalConfig.emailCodeDuration[codeType].timeout,
            {
                minutes: true,
                days: true,
                weeks: true,
                months: true,
            },
            {
                decimalCount: 0,
                blockJustNow: true,
                useOnlyLargestUnit: true,
            },
        );

        const timeoutText = `. \n\nThis URL expires ${timeoutDurationString}.`;

        if (
            codeType === EmailCodeType.AccountVerification ||
            codeType === EmailCodeType.ChangedEmailVerification
        ) {
            await this.sendEmail({
                subject: 'Verify email address',
                text: `Verify your email address here: ${verificationUrl}${timeoutText}`,
                toAddresses: [toEmailAddress],
                relevantRequest: request,
                sentBecauseOf: {
                    sentBecauseOfEmailCodeId: newVerificationCode.id,
                    sentBecauseOfUserId: codeForUser.id,
                },
                relevantTeamId: relevantTeam?.id,
            });
        } else if (codeType === EmailCodeType.PasswordReset) {
            await this.sendEmail({
                subject: 'Password reset',
                text: `Reset your password here: ${verificationUrl}${timeoutText}`,
                toAddresses: [toEmailAddress],
                relevantRequest: request,
                sentBecauseOf: {
                    sentBecauseOfEmailCodeId: newVerificationCode.id,
                    sentBecauseOfUserId: codeForUser.id,
                },
                relevantTeamId: relevantTeam?.id,
            });
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (codeType === EmailCodeType.UserInvitation) {
            assert.isDefined(relevantTeam, 'Cannot send user invite without a team.');

            await this.sendEmail({
                subject: `${this.clients.backendEnvClient.universalConfig.companyProperName} Invite`,
                text: `You have been invited to ${this.clients.backendEnvClient.universalConfig.companyProperName} on team ${relevantTeam.teamName}! Open this link to accept: ${verificationUrl}${timeoutText}`,
                toAddresses: [toEmailAddress],
                relevantRequest: request,
                sentBecauseOf: {
                    sentBecauseOfEmailCodeId: newVerificationCode.id,
                    sentBecauseOfUserId: codeForUser.id,
                },
                relevantTeamId: relevantTeam.id,
            });
        } else {
            assert.tsType(codeType).equals<never>();
            throw new Error(`Unexpected email code type: ${String(codeType)}`);
        }

        await this.clients.eventLogClient.logEvent(EventLogName.EmailCodeSend, request, {
            data: {
                emailAddress: toEmailAddress,
                codeType,
            },
            relations: {
                userId: codeForUser.id,
                teamId: relevantTeam?.id,
                emailCodeId: newVerificationCode.id,
            },
        });

        return true;
    }
}

export function createDevEmailPath(
    deployEnv: DeployEnv,
    testName: string | undefined,
): string | undefined {
    if (deployEnv !== DeployEnv.Dev) {
        return undefined;
    }

    const subDirName = testName || deployEnv;

    return join(devEmailsDirPath, subDirName);
}
