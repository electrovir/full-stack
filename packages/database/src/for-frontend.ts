import {type PrismaFullModel} from '@augment-vir/common';
import {type Prisma} from './generated/client.js';
import {type ModelName} from './generated/internal/prismaNamespaceBrowser.js';

/**
 * Everything exported here _needs_ to be compatible with frontend code.
 *
 * See `index.ts` for backend code.
 */
export * from './generated/browser.js';
export {type Prisma, type PrismaClient} from './generated/client.js';
export * from './generated/enums.js';
export * from './generated/internal/prismaNamespaceBrowser.js';
export * from './generated/shapes.gen.js';

export type FullModel<Model extends ModelName> = PrismaFullModel<Prisma.TypeMap, Model>;
