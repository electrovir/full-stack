import {type SelectFrom} from '@augment-vir/common';
import {hashPassword} from 'auth-vir';
import {type RequireExactlyOne} from 'type-fest';
import {type UniversalConfig} from './universal-config.js';

export enum PasswordFailureReason {
    TooShort = 'too-short',
}

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
        failureReason: PasswordFailureReason;
    }>
> {
    if (password.length < universalConfig.password.minLength) {
        return {
            failureReason: PasswordFailureReason.TooShort,
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
