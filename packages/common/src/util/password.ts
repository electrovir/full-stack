import {type SelectFrom} from '@augment-vir/common';
import {hashPassword} from 'auth-vir';
import {type RequireExactlyOne} from 'type-fest';
import {type UniversalConfig} from '../universal-config.js';

// eslint-disable-next-line sonarjs/no-hardcoded-passwords
export const passwordTooShortErrorMessage = 'Password too short';

export async function preparePassword(
    password: string,
    universalConfig: Readonly<
        SelectFrom<
            UniversalConfig,
            {
                password: {
                    minLength: true;
                };
            }
        >
    >,
): Promise<
    RequireExactlyOne<{
        password: {
            raw: string;
            hashed: string;
        };
        failureReason: string;
    }>
> {
    if (password.length < universalConfig.password.minLength) {
        return {
            failureReason: passwordTooShortErrorMessage,
        };
    }

    const hashedPassword = await hashPassword(password);

    return {
        password: {
            raw: password,
            hashed: hashedPassword,
        },
    };
}
