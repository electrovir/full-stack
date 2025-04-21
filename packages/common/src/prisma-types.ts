import {type PrismaFullModel, type PrismaModelName} from '@augment-vir/common';
import {type PrismaClient} from '@evir/database';

export * from 'prisma-frontend/dist/index.js';

export type ModelName = PrismaModelName<PrismaClient>;
export type FullModel<Model extends ModelName> = PrismaFullModel<PrismaClient, Model>;
