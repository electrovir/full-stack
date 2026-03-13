// cspell:disable

import {assert, assertWrap} from '@augment-vir/assert';
import {awaitedForEach, extractDuplicates, repeatArray} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {PasswordFailureReason, preparePassword} from './password.js';

const mockUniversalConfig = {
    password: {
        minLength: 8,
    },
} as const;

async function testPreparePassword(password: string) {
    const result = await preparePassword(password, mockUniversalConfig);

    if ('failureReason' in result) {
        throw new Error(result.failureReason);
    } else if (!('password' in result)) {
        throw new Error('Expected password result but got failure');
    } else if (result.password.raw !== password) {
        throw new Error('Raw password does not match input');
    } else if (result.password.hashed === password) {
        throw new Error('Hashed password should not equal raw password');
    }
}

async function assertNoDuplicateHashes(passwords: string[]) {
    const hashes: string[] = [];
    await awaitedForEach(passwords, async (password) => {
        const result = await preparePassword(password, mockUniversalConfig);
        hashes.push(assertWrap.isTruthy(result.password).hashed);
    });
    const {duplicates} = extractDuplicates(hashes);
    assert.isEmpty(duplicates, `Duplicate hashes: ${duplicates.join(', ')}`);
}

describe(preparePassword.name, () => {
    it('rejects passwords shorter than minimum length and accepts at minimum length', async () => {
        const minLength = mockUniversalConfig.password.minLength;

        await awaitedForEach(
            Array.from(
                {
                    length: minLength,
                },
                (_, length) => length,
            ),
            async (length) => {
                const password = 'a'.repeat(length);
                await assert.throws(() => testPreparePassword(password), {
                    matchMessage: PasswordFailureReason.TooShort,
                });
            },
        );

        const validPassword = 'a'.repeat(minLength);
        await testPreparePassword(validPassword);
    });

    itCases(testPreparePassword, [
        // cspell:disable-next-line
        {
            it: 'accepts long ascii',
            input: 'validpassword123',
            throws: undefined,
        },
        {
            it: 'accepts mixed symbols',
            input: 'P@ssw0rd!',
            throws: undefined,
        },
        {
            it: 'accepts long mixed',
            input: 'MySecurePassword2024',
            throws: undefined,
        },
        {
            it: 'accepts very long',
            input: 'a'.repeat(50),
            throws: undefined,
        },
        {
            it: 'null byte',
            input: 'password\x00',
            throws: undefined,
        },
        {
            it: 'CRLF',
            input: 'password\r\n',
            throws: undefined,
        },
        {
            it: 'script tag',
            input: '<script>alert("xss")</script>password',
            throws: undefined,
        },
        {
            it: 'sql injection style',
            input: 'password"; DROP TABLE users; --',
            throws: undefined,
        },
        {
            it: 'sql tautology',
            input: "password' OR '1'='1",
            throws: undefined,
        },
        {
            it: 'control chars',
            input: 'password\t\b\f\v',
            throws: undefined,
        },
        {
            it: 'zero width',
            input: 'password\u200B\uFEFF',
            throws: undefined,
        },
        // cspell:disable-next-line
        {
            it: 'cyrillic',
            input: 'пароль123',
            throws: undefined,
        },
        // cspell:disable-next-line
        {
            it: 'japanese',
            input: 'パスワード123',
            throws: undefined,
        },
        // cspell:disable-next-line
        {
            it: 'arabic',
            input: 'كلمة مرور123',
            throws: undefined,
        },
        // cspell:disable-next-line
        {
            it: 'spanish ñ',
            input: 'contraseña123',
            throws: undefined,
        },
        // cspell:disable-next-line
        {
            it: 'umlauts',
            input: 'mötlörmöd123',
            throws: undefined,
        },
        {
            it: 'emoji',
            input: '🔒secure🔑123',
            throws: undefined,
        },
        {
            it: 'mixed emoji',
            input: 'password🌟2024',
            throws: undefined,
        },
        {
            it: 'extremely long',
            input: 'a'.repeat(10_000),
            throws: undefined,
        },
    ]);

    it('should produce different hashes for different passwords', async () => {
        await assertNoDuplicateHashes([
            'password123',
            'password124',
            'Password123',
            'password 123',
        ]);
    });

    it('should generate a unique hash each time for the same password', async () => {
        // cspell:disable-next-line
        await assertNoDuplicateHashes(repeatArray(10, ['consistentpassword123']));
    });
});
