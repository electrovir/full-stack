import {assert} from '@augment-vir/assert';
import {log} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {hashPassword} from 'auth-vir';
import {isValidIsoString} from 'date-vir';
import {rm} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createPostgresPrismaClient, createTestDatabasePath} from './client.js';

describe(createPostgresPrismaClient.name, () => {
    it('creates a functioning database', async (testContext) => {
        await rm(dirname(createTestDatabasePath(testContext)), {force: true, recursive: true});
        const prismaClient = await createPostgresPrismaClient({
            dev: {
                allowSeeding: false,
                testContext,
            },
        });

        const user = await prismaClient.user.create({
            data: {
                emailAddress: 'test',
                normalizedEmailAddress: 'test',
                password: await hashPassword('test'),
            },
        });
        assert.isTrue(isValidIsoString(user.createdAt));
    });
    it('can connect to the database', async (testContext) => {
        const prismaClient = await createPostgresPrismaClient({
            dev: {
                allowSeeding: false,
                testContext: testContext,
            },
        });
        const result = await prismaClient.$executeRaw`SELECT 1;`;

        log.faint(result);
        assert.isDefined(result);
    });
});
