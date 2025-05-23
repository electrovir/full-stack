import {check} from '@augment-vir/assert';
import {DeployEnv} from '@evir/common';
import {type BackendConfig} from '@evir/common-backend';
import {
    type CookieParams,
    type CreateJwtParams,
    extractUserIdFromRequestHeaders,
    generateLogoutHeaders,
    generateSuccessfulLoginHeaders,
    type JwtKeys,
    parseJwtKeys,
} from 'auth-vir';
import {type IncomingHttpHeaders, type OutgoingHttpHeaders} from 'node:http';
import {type SecretsClient} from './secrets-client/secrets-client.js';

export const InvalidId = '-1';
export type InvalidId = typeof InvalidId;

export enum CookieName {
    Auth = 'auth',
    SignUp = 'sign-up',
}

export class AuthClient {
    protected cachedParsedJwtKeys: Record<string, Readonly<JwtKeys>> = {};
    public readonly CookieName = CookieName;
    public readonly InvalidId = InvalidId;

    constructor(
        private readonly secretsClient: Readonly<SecretsClient>,
        private readonly backendConfig: Readonly<BackendConfig>,
        private readonly deployEnv: DeployEnv,
    ) {}

    public async getJwtParams(): Promise<Readonly<CreateJwtParams>> {
        const cacheKey = JSON.stringify(this.secretsClient.get.jwtKeys);

        const cachedParsedKeys = this.cachedParsedJwtKeys[cacheKey];
        const parsedKeys = cachedParsedKeys ?? (await parseJwtKeys(this.secretsClient.get.jwtKeys));

        if (!cachedParsedKeys) {
            this.cachedParsedJwtKeys = {[cacheKey]: parsedKeys};
        }
        return {
            jwtKeys: parsedKeys,
            audience: 'server-context',
            issuer: 'server-auth',
            jwtDuration: this.backendConfig.authCookieDuration,
        };
    }

    private async getCookieParams({
        serviceOrigin,
        isSignUpCookie,
    }: {
        serviceOrigin: string;
        /**
         * Set this to `true` when we are setting the initial cookie right after a user signs up.
         * This allows them to auto-authorize when they verify their email address.
         *
         * This should only be set to `true` when a new user is signing up.
         */
        isSignUpCookie?: boolean | undefined;
    }): Promise<Readonly<CookieParams>> {
        return {
            cookieDuration: this.backendConfig.authCookieDuration,
            hostOrigin: serviceOrigin,
            jwtParams: await this.getJwtParams(),
            isDev: this.deployEnv === DeployEnv.Dev,
            cookieName: isSignUpCookie ? CookieName.SignUp : CookieName.Auth,
        };
    }

    public async getCookieUserId({
        headers,
        isSignUpCookie,
    }: {
        headers: IncomingHttpHeaders;
        isSignUpCookie?: boolean | undefined;
    }): Promise<string | undefined> {
        return await extractUserIdFromRequestHeaders(
            headers,
            await this.getJwtParams(),
            isSignUpCookie ? CookieName.SignUp : CookieName.Auth,
        );
    }

    private mergeHeaderValues(...values: (string | string[] | undefined)[]): string[] {
        const finalHeaderValues: string[] = [];

        values.forEach((value) => {
            if (check.isArray(value)) {
                finalHeaderValues.push(...value);
            } else if (check.isString(value)) {
                finalHeaderValues.push(value);
            }
        });

        return finalHeaderValues;
    }

    public async createLogoutHeaders(
        serviceOrigin: string,
        params: {isSignUpCookie: boolean} | {allCookies: true},
    ): Promise<OutgoingHttpHeaders> {
        if ('allCookies' in params) {
            const signUpCookieHeaders = generateLogoutHeaders(
                await this.getCookieParams({
                    serviceOrigin,
                    isSignUpCookie: true,
                }),
            );
            const authCookieHeaders = generateLogoutHeaders(
                await this.getCookieParams({
                    serviceOrigin,
                    isSignUpCookie: false,
                }),
            );

            return {
                ...authCookieHeaders,
                'set-cookie': this.mergeHeaderValues(
                    signUpCookieHeaders['set-cookie'],
                    authCookieHeaders['set-cookie'],
                ),
            };
        } else {
            return generateLogoutHeaders(
                await this.getCookieParams({
                    serviceOrigin,
                    isSignUpCookie: params.isSignUpCookie,
                }),
            );
        }
    }

    public async createSuccessfulCookieHeaders({
        userId,
        serviceOrigin,
        requestHeaders,
        isSignUpCookie,
    }: {
        userId: string;
        serviceOrigin: string;
        requestHeaders: IncomingHttpHeaders;
        isSignUpCookie: boolean;
    }): Promise<OutgoingHttpHeaders> {
        const oppositeCookieName = isSignUpCookie ? CookieName.Auth : CookieName.SignUp;
        const hasExistingOppositeCookie = requestHeaders.cookie?.includes(`${oppositeCookieName}=`);

        const discardOppositeCookieHeaders = hasExistingOppositeCookie
            ? generateLogoutHeaders(
                  await this.getCookieParams({
                      serviceOrigin,
                      isSignUpCookie: !isSignUpCookie,
                  }),
              )
            : undefined;

        const newCookieHeaders = await generateSuccessfulLoginHeaders(
            userId,
            await this.getCookieParams({
                serviceOrigin,
                isSignUpCookie,
            }),
        );

        return {
            ...newCookieHeaders,
            'set-cookie': this.mergeHeaderValues(
                newCookieHeaders['set-cookie'],
                discardOppositeCookieHeaders?.['set-cookie'],
            ),
        };
    }
}
