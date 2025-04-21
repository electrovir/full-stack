import {HttpStatus} from '@augment-vir/common';
import {EmailCodeType, preparePassword, type TemplateService} from '@evir/common';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {doesPasswordMatchHash} from 'auth-vir';
import {createUtcFullDate, diffDates, getNowInIsoString, getNowInUtcTimezone} from 'date-vir';
import {normalizeEmailAddress} from 'parse-email-address';
import {type BackendContext} from '../create-backend-context.js';

export async function verify(
    this: void,
    {
        context,
        requestData,
    }: EndpointImplementationParams<BackendContext, TemplateService['endpoints']['/verify']>,
): Promise<EndpointImplementationOutput<TemplateService['endpoints']['/verify']['ResponseType']>> {
    const existingCode = await context.prismaClient.emailCode.findFirst({
        where: {
            id: requestData.id,
            codeType: requestData.codeType,
            user: {
                deactivatedAt: null,
            },
        },
        select: {
            id: true,
            code: true,
            createdAt: true,
            codeType: true,
            emailAddress: true,
            usedAt: true,
            user: {
                select: {
                    id: true,
                    accountVerifiedAt: true,
                },
            },
        },
    });

    const codeHasExpired =
        !existingCode ||
        existingCode.usedAt ||
        Math.abs(
            diffDates(
                {
                    start: createUtcFullDate(existingCode.createdAt),
                    end: getNowInUtcTimezone(),
                },
                {minutes: true},
            ).minutes,
        ) >
            context.envClient.backendConfig.emailCodeDuration[existingCode.codeType].timeout
                .minutes;

    if (
        existingCode &&
        !codeHasExpired &&
        (await doesPasswordMatchHash({
            hash: existingCode.code,
            password: requestData.code,
        }))
    ) {
        if (existingCode.codeType === EmailCodeType.AccountVerification) {
            if (existingCode.user.accountVerifiedAt) {
                /** Account already verified. */
            } else {
                await context.prismaClient.user.update({
                    where: {
                        id: existingCode.user.id,
                    },
                    data: {
                        accountVerifiedAt: getNowInIsoString(),
                    },
                });
                await context.prismaClient.emailCode.update({
                    where: {
                        id: existingCode.id,
                    },
                    data: {
                        usedAt: getNowInIsoString(),
                    },
                });

                return {
                    statusCode: HttpStatus.Ok,
                };
            }
        } else if (existingCode.codeType === EmailCodeType.PasswordReset) {
            if (!requestData.newPassword) {
                /** The first request for verifying a password reset code won't have the password. */
                return {
                    statusCode: HttpStatus.Ok,
                };
            }

            const preparedPassword = await preparePassword(
                requestData.newPassword,
                context.envClient.backendConfig.universalConfig,
            );

            if (!preparedPassword.password) {
                return {
                    statusCode: HttpStatus.BadRequest,
                    responseErrorMessage: preparedPassword.failureReason,
                };
            }

            await context.prismaClient.user.update({
                where: {
                    id: existingCode.user.id,
                },
                data: {
                    password: preparedPassword.password.hashed,
                },
            });
            await context.prismaClient.emailCode.update({
                where: {
                    id: existingCode.id,
                },
                data: {
                    usedAt: getNowInIsoString(),
                },
            });

            return {
                statusCode: HttpStatus.Ok,
            };
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (existingCode.codeType === EmailCodeType.ChangedEmailVerification) {
            if (!context.authenticatedUser) {
                return {
                    statusCode: HttpStatus.Unauthorized,
                };
            } else if (context.authenticatedUser.id !== existingCode.user.id) {
                return {
                    statusCode: HttpStatus.BadRequest,
                };
            }

            const normalizedEmailAddress = normalizeEmailAddress(existingCode.emailAddress);

            if (!normalizedEmailAddress) {
                return {
                    statusCode: HttpStatus.BadRequest,
                    responseErrorMessage: 'Invalid email address.',
                };
            }

            const existingUser = await context.prismaClient.user.findFirst({
                where: {
                    OR: [
                        {
                            emailAddress: existingCode.emailAddress,
                        },
                        {
                            normalizedEmailAddress,
                        },
                    ],
                },
                select: {
                    id: true,
                },
            });

            if (existingUser) {
                return {
                    statusCode: HttpStatus.BadRequest,
                    responseErrorMessage: 'You already have an account with this email address.',
                };
            }

            await context.prismaClient.user.update({
                where: {
                    id: existingCode.user.id,
                },
                data: {
                    emailAddress: existingCode.emailAddress,
                    normalizedEmailAddress,
                    unverifiedNewEmailAddress: null,
                },
            });

            await context.prismaClient.emailCode.update({
                where: {
                    id: existingCode.id,
                },
                data: {
                    usedAt: getNowInIsoString(),
                },
            });

            return {
                statusCode: HttpStatus.Ok,
            };
        }
    }

    return {
        statusCode: HttpStatus.BadRequest,
    };
}
