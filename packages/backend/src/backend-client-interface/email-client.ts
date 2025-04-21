import {log, randomString} from '@augment-vir/common';
import {SendEmailCommand, SESv2Client} from '@aws-sdk/client-sesv2';
import {
    DeployEnv,
    EmailCodeType,
    frontendPathTree,
    getOffsetDbTime,
    type FrontendSearchParams,
    type User,
} from '@evir/common';
import {type BackendConfig} from '@evir/common-backend';
import {type PrismaClient} from '@evir/database';
import {hashPassword} from 'auth-vir';
import {type RequireExactlyOne} from 'type-fest';
import {buildUrl} from 'url-vir';

export type SendEmailParams = RequireExactlyOne<{
    toAddresses: string[];
    toUsers: User['id'][];
}> & {
    /** Raw text version of the email for clients that do not support fancy HTML emails. */
    text: string;
    /** If HTML is not provided, `text` will be used instead. */
    html?: string;
    subject: string;
};

const fromNameAddition: Partial<Record<DeployEnv, string>> = {
    [DeployEnv.Staging]: ' Staging',
};

export class EmailClient {
    protected awsSesClient: SESv2Client | undefined;

    constructor(
        protected readonly deployEnv: DeployEnv,
        protected readonly prismaClient: PrismaClient,
        protected readonly backendConfig: Readonly<BackendConfig>,
    ) {}

    public async sendEmail(params: SendEmailParams) {
        if (this.deployEnv === DeployEnv.Dev) {
            log.mutate(params.text);
        } else {
            if (!this.awsSesClient) {
                this.awsSesClient = new SESv2Client({
                    region: this.backendConfig.aws.region,
                });
            }

            const toAddresses =
                params.toAddresses ||
                (
                    await this.prismaClient.user.findMany({
                        where: {
                            id: {
                                in: params.toUsers,
                            },
                        },
                        select: {
                            emailAddress: true,
                        },
                    })
                ).map((entry) => entry.emailAddress);

            const sendEmailCommand = new SendEmailCommand({
                Content: {
                    Simple: {
                        Body: {
                            Html: {
                                Data: params.html || params.text,
                            },
                            Text: {
                                Data: params.text,
                            },
                        },
                        Subject: {
                            Data: params.subject,
                        },
                    },
                },
                Destination: {
                    ToAddresses: toAddresses,
                },
                FromEmailAddress: `"${fromNameAddition[this.deployEnv] || ''}" <${this.backendConfig.fromEmailAddress[this.deployEnv]}>`,
            });

            await this.awsSesClient.send(sendEmailCommand);
        }
    }

    /** Emails a verification code to the user. */
    public async sendVerificationCode(
        /**
         * The origin extracted from the user's request. This is used in dev only.
         *
         * @example Request.headers.origin
         */
        requestOrigin: string,
        user: Readonly<Pick<User, 'id' | 'emailAddress'>>,
        codeType: EmailCodeType,
    ) {
        const existingVerificationCode = await this.prismaClient.emailCode.findFirst({
            /**
             * This intentionally does not depend on the `codeHasBeenUsed` field because even if
             * there is an existing code that has been used, we still want to rate limit codes of
             * the same type.
             */
            where: {
                userId: user.id,
                createdAt: {
                    gte: getOffsetDbTime({
                        minutes: -this.backendConfig.emailCodeDuration[codeType].overlap.minutes,
                    }),
                },
                codeType,
            },
            select: {
                id: true,
            },
        });

        if (existingVerificationCode) {
            if (this.deployEnv === DeployEnv.Dev) {
                log.error(
                    new Error(
                        `Did not send verification code to email '${user.emailAddress}', an existing '${codeType}' code already exists.`,
                    ),
                );
            }
            /** Don't send a new code if there's an existing valid one of the same type. */
            return;
        }

        const verificationCode = randomString(60);

        const hashedVerificationCode = await hashPassword(verificationCode);

        if (!hashedVerificationCode) {
            const error = new Error(
                `Verification code is too long for bcrypt (${verificationCode.length})`,
            );
            log.error(error);
            throw error;
        }

        const newVerificationCodeEntry = await this.prismaClient.emailCode.create({
            data: {
                code: hashedVerificationCode,
                userId: user.id,
                codeType,
                emailAddress: user.emailAddress,
            },
        });

        const verificationOrigin: string =
            this.deployEnv === DeployEnv.Dev
                ? requestOrigin || ''
                : this.backendConfig.clientOrigin[this.deployEnv];

        const verificationUrl = buildUrl(verificationOrigin, {
            paths: [frontendPathTree.paths.children.verify.path],
            search: {
                id: [newVerificationCodeEntry.id],
                code: [verificationCode],
                type: [codeType],
            } satisfies FrontendSearchParams,
        }).href;

        if (
            codeType === EmailCodeType.AccountVerification ||
            codeType === EmailCodeType.ChangedEmailVerification
        ) {
            await this.sendEmail({
                subject: 'Verify email address',
                text: `Verify your email address here: ${verificationUrl}`,
                toAddresses: [user.emailAddress],
            });
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (codeType === EmailCodeType.PasswordReset) {
            await this.sendEmail({
                subject: 'Password reset',
                text: `Reset your password here: ${verificationUrl}`,
                toAddresses: [user.emailAddress],
            });
        } else {
            throw new Error(`Unexpected email code type: ${String(codeType)}`);
        }
    }
}
