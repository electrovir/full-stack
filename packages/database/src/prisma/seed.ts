import {type PrismaAddModelData} from '@augment-vir/node';
import {hashPassword} from 'auth-vir';
import {type PrismaClient} from '../index.js';

export const seedData: PrismaAddModelData<PrismaClient> = {
    user: [
        {
            emailAddress: 'test@example.com',
            normalizedEmailAddress: 'test@example.com',
            password: await hashPassword('just a test password'),
        },
    ],
};
