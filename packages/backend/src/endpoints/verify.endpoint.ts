import {HttpStatus, log} from '@augment-vir/common';
import {
    AuthenticationOutcome,
    EmailCodeType,
    EventLogName,
    SortOrder,
    preparePassword,
    type BackendService,
} from '@evir/common';
import {getSelectedTeamIdFromHeaders} from '@evir/common-backend/src/data/selected-team-id.js';
import {
    type EndpointImplementationOutput,
    type EndpointImplementationParams,
} from '@rest-vir/implement-service';
import {doesPasswordMatchHash} from 'auth-vir';
import {
    convertDuration,
    createUtcFullDate,
    diffDates,
    getNowInIsoString,
    getNowInUtcTimezone,
} from 'date-vir';
import {type OutgoingHttpHeaders} from 'node:http';
import {normalizeEmailAddress} from 'parse-email-address';
import {type BackendContext} from '../context/create-backend-context.js';

export async function verifyEndpoint(
    this: void,
    {
        context,
        requestData,
        requestHeaders,
        request,
    }: EndpointImplementationParams<BackendContext, BackendService['endpoints']['/verify']>,
): Promise<EndpointImplementationOutput<BackendService['endpoints']['/verify']['ResponseType']>> {
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
            invitedToTeamId: true,
            user: {
                select: {
                    id: true,
                    accountVerifiedAt: true,
                    teamPermissions: {
                        where: {
                            isEnabled: true,
                        },
                        select: {
                            teamId: true,
                        },
                        orderBy: {
                            createdAt: SortOrder.desc,
                        },
                        take: 1,
                    },
                },
            },
        },
    });

    const rejection = {
        statusCode: HttpStatus.BadRequest,
        headers: {
            'set-cookie': (
                await context.backendAuthClient.createLogoutHeaders({
                    isSignUpCookie: true,
                })
            )['set-cookie'],
        },
    } as const;

    if (!existingCode) {
        log.warning('Verification code not found.');
        await context.eventLogClient.logEvent(EventLogName.EmailCodeFailure, request, {
            data: {
                reason: 'Verification code not found',
                codeType: requestData.codeType,
            },
            relations: {},
        });
        return rejection;
    }

    const userTeamId = getSelectedTeamIdFromHeaders(requestHeaders);

    if (existingCode.usedAt) {
        log.warning('Verification code already used.');
        await context.eventLogClient.logEvent(EventLogName.EmailCodeFailure, request, {
            data: {
                reason: 'Verification code already used',
                codeType: existingCode.codeType,
            },
            relations: {
                userId: existingCode.user.id,
                teamId: userTeamId,
                emailCodeId: existingCode.id,
            },
        });
        return rejection;
    }

    const codeAge = diffDates(
        {
            start: createUtcFullDate(existingCode.createdAt),
            end: getNowInUtcTimezone(),
        },
        {
            milliseconds: true,
        },
    );

    const codeHasExpired =
        Math.abs(codeAge.milliseconds) >
        convertDuration(
            context.backendEnvClient.universalConfig.emailCodeDuration[existingCode.codeType]
                .timeout,
            {
                milliseconds: true,
            },
        ).milliseconds;

    if (codeHasExpired) {
        await context.emailClient.clearVerificationCodes({
            byCodeId: existingCode.id,
        });
        log.warning('Verification code has expired.', {
            timeoutMinutes: convertDuration(
                context.backendEnvClient.universalConfig.emailCodeDuration[existingCode.codeType]
                    .timeout,
                {
                    minutes: true,
                },
            ).minutes,
            codeAge,
            createdAt: existingCode.createdAt,
            now: getNowInUtcTimezone(),
        });
        await context.eventLogClient.logEvent(EventLogName.EmailCodeFailure, request, {
            data: {
                reason: 'Verification code expired',
                codeType: existingCode.codeType,
            },
            relations: {
                userId: existingCode.user.id,
                teamId: userTeamId,
                emailCodeId: existingCode.id,
            },
        });
        return rejection;
    }

    const codeMatches = await doesPasswordMatchHash({
        hash: existingCode.code,
        password: requestData.code,
    });

    if (!codeMatches) {
        log.warning('Verification code does not match its id.');
        await context.eventLogClient.logEvent(EventLogName.EmailCodeFailure, request, {
            data: {
                reason: 'Verification code does not match',
                codeType: existingCode.codeType,
            },
            relations: {
                userId: existingCode.user.id,
                teamId: userTeamId,
                emailCodeId: existingCode.id,
            },
        });
        return rejection;
    }

    const codeUser = await context.prismaClient.user.findUnique({
        where: {
            id: existingCode.user.id,
            deactivatedAt: null,
            teamPermissions: {
                some: {
                    isEnabled: true,
                    team: {
                        deactivatedAt: null,
                    },
                },
            },
        },
        select: {
            id: true,
            password: true,
            accountVerifiedAt: true,
        },
    });

    if (!codeUser) {
        log.warning('Verification code has not attached user.');
        await context.eventLogClient.logEvent(EventLogName.EmailCodeFailure, request, {
            data: {
                reason: 'Verification code has no attached user',
                codeType: existingCode.codeType,
            },
            relations: {
                emailCodeId: existingCode.id,
            },
        });
        return rejection;
    } else if (context.authenticatedUser && context.authenticatedUser.id !== codeUser.id) {
        log.warning('Verification code does not match current user.');
        await context.eventLogClient.logEvent(EventLogName.EmailCodeFailure, request, {
            data: {
                reason: 'Verification code does not match current user',
                codeType: existingCode.codeType,
            },
            relations: {
                userId: existingCode.user.id,
                teamId: userTeamId,
                emailCodeId: existingCode.id,
            },
        });
        return rejection;
    } else if (existingCode.codeType === EmailCodeType.AccountVerification) {
        if (codeUser.accountVerifiedAt) {
            log.warning('Account already verified.');
            return {
                statusCode: HttpStatus.BadRequest,
                responseErrorMessage: 'Already verified.',
            };
        } else {
            const signUpUserId = (
                await context.backendAuthClient.getSecureUser({
                    requestHeaders,
                    isSignUpCookie: true,
                    allowUserAuthRefresh: false,
                })
            )?.user.id;

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

            await context.eventLogClient.logEvent(EventLogName.EmailCodeVerify, request, {
                data: {
                    emailAddress: existingCode.emailAddress,
                    codeType: existingCode.codeType,
                },
                relations: {
                    userId: existingCode.user.id,
                    teamId: userTeamId,
                    emailCodeId: existingCode.id,
                },
            });

            const headers: OutgoingHttpHeaders =
                signUpUserId === existingCode.user.id
                    ? await context.backendAuthClient.createLoginHeaders({
                          isSignUpCookie: false,
                          requestHeaders,
                          userId: existingCode.user.id,
                      })
                    : {};

            return {
                statusCode: HttpStatus.Ok,
                headers,
            };
        }
    } else if (existingCode.codeType === EmailCodeType.PasswordReset) {
        if (!requestData.newPassword) {
            /**
             * The first request for verifying a password reset code won't have the new user-input
             * password yet.
             */
            return {
                statusCode: HttpStatus.Ok,
            };
        }

        const preparedPassword = await preparePassword(
            requestData.newPassword,
            context.backendEnvClient.universalConfig,
        );

        if (!preparedPassword.password) {
            log.warning(`Failed to reset password: ${preparedPassword.failureReason}`);
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

        await context.eventLogClient.logEvent(EventLogName.AuthenticationEvent, request, {
            data: {
                emailAddress: existingCode.emailAddress,
                outcome: AuthenticationOutcome.PasswordResetCompleted,
            },
            relations: {
                userId: existingCode.user.id,
                teamId: userTeamId,
            },
        });

        await context.eventLogClient.logEvent(EventLogName.EmailCodeVerify, request, {
            data: {
                emailAddress: existingCode.emailAddress,
                codeType: existingCode.codeType,
            },
            relations: {
                userId: existingCode.user.id,
                teamId: userTeamId,
                emailCodeId: existingCode.id,
            },
        });

        return {
            statusCode: HttpStatus.Ok,
        };
    } else if (existingCode.codeType === EmailCodeType.ChangedEmailVerification) {
        if (!context.authenticatedUser) {
            return {
                statusCode: HttpStatus.Unauthorized,
            };
        } else if (context.authenticatedUser.id !== existingCode.user.id) {
            log.warning('Verification code is for a different user.');
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
                AND: [
                    {
                        deactivatedAt: null,
                        teamPermissions: {
                            some: {
                                isEnabled: true,
                                team: {
                                    deactivatedAt: null,
                                },
                            },
                        },
                    },
                    {
                        OR: [
                            {
                                emailAddress: existingCode.emailAddress,
                            },
                            {
                                normalizedEmailAddress,
                            },
                        ],
                    },
                ],
            },
            select: {
                id: true,
            },
        });

        if (existingUser) {
            log.warning('New user email address is already in use.');
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

        await context.eventLogClient.logEvent(EventLogName.EmailCodeVerify, request, {
            data: {
                emailAddress: existingCode.emailAddress,
                codeType: existingCode.codeType,
            },
            relations: {
                userId: existingCode.user.id,
                teamId: userTeamId,
                emailCodeId: existingCode.id,
            },
        });

        return {
            statusCode: HttpStatus.Ok,
        };
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (existingCode.codeType === EmailCodeType.UserInvitation) {
        const isAlreadyVerified = !!codeUser.accountVerifiedAt && !!codeUser.password;

        if (isAlreadyVerified) {
            /**
             * Already-verified users just need the team permission created. No password setup
             * required.
             */
            if (existingCode.invitedToTeamId) {
                await context.prismaClient.teamPermission.upsert({
                    where: {
                        userId_teamId: {
                            userId: existingCode.user.id,
                            teamId: existingCode.invitedToTeamId,
                        },
                    },
                    create: {
                        userId: existingCode.user.id,
                        teamId: existingCode.invitedToTeamId,
                        isEnabled: true,
                    },
                    update: {
                        isEnabled: true,
                    },
                    select: {
                        id: true,
                    },
                });
            }

            await context.prismaClient.emailCode.update({
                where: {
                    id: existingCode.id,
                },
                data: {
                    usedAt: getNowInIsoString(),
                },
            });

            await context.eventLogClient.logEvent(EventLogName.EmailCodeVerify, request, {
                data: {
                    emailAddress: existingCode.emailAddress,
                    codeType: existingCode.codeType,
                },
                relations: {
                    userId: existingCode.user.id,
                    teamId: existingCode.invitedToTeamId || userTeamId,
                    emailCodeId: existingCode.id,
                },
            });

            return {
                statusCode: HttpStatus.Ok,
            };
        } else if (!requestData.newPassword) {
            /**
             * The first request for verifying an invitation code won't have the new user-input
             * password yet.
             */
            return {
                statusCode: HttpStatus.Ok,
            };
        }

        const now = getNowInIsoString();

        const preparedPassword = await preparePassword(
            requestData.newPassword,
            context.backendEnvClient.universalConfig,
        );

        if (!preparedPassword.password) {
            log.warning(`Failed to set password: ${preparedPassword.failureReason}`);
            return {
                statusCode: HttpStatus.BadRequest,
                responseErrorMessage: preparedPassword.failureReason,
            };
        }

        if (existingCode.invitedToTeamId) {
            await context.prismaClient.teamPermission.upsert({
                where: {
                    userId_teamId: {
                        userId: existingCode.user.id,
                        teamId: existingCode.invitedToTeamId,
                    },
                },
                create: {
                    userId: existingCode.user.id,
                    teamId: existingCode.invitedToTeamId,
                    isEnabled: true,
                },
                update: {
                    isEnabled: true,
                },
                select: {
                    id: true,
                },
            });
        }

        await context.prismaClient.user.update({
            where: {
                id: existingCode.user.id,
            },
            data: {
                password: preparedPassword.password.hashed,
                accountVerifiedAt: now,
                ...(requestData.newHumanName
                    ? {
                          humanName: requestData.newHumanName,
                      }
                    : {}),
            },
        });
        await context.prismaClient.emailCode.update({
            where: {
                id: existingCode.id,
            },
            data: {
                usedAt: now,
            },
        });

        await context.eventLogClient.logEvent(EventLogName.EmailCodeVerify, request, {
            data: {
                emailAddress: existingCode.emailAddress,
                codeType: existingCode.codeType,
            },
            relations: {
                userId: existingCode.user.id,
                teamId: existingCode.invitedToTeamId || userTeamId,
                emailCodeId: existingCode.id,
            },
        });

        return {
            statusCode: HttpStatus.Ok,
        };
    }

    log.warning(`Unexpected code type: ${requestData.codeType}`);
    return rejection;
}
