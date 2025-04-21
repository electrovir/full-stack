import {type SelectFrom} from '@augment-vir/common';
import {hashPassword} from 'auth-vir';
import {type RequireExactlyOne} from 'type-fest';
import {type UniversalConfig} from '../universal-config.js';

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
    if (!password) {
        return {
            failureReason: 'Password too short',
        };
    }

    if (password.length < universalConfig.password.minLength) {
        return {
            failureReason: 'Password too short',
        };
    }

    const hashedPassword = await hashPassword(password);
    if (!hashedPassword) {
        return {
            failureReason: 'Password too long',
        };
    }

    return {
        password: {
            raw: password,
            hashed: hashedPassword,
        },
    };
}
