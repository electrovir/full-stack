/**
 * Everything exported here should only be expected to be used in the backend.
 *
 * See `browser-index.ts` for browser compatible code.
 */

export {skip} from '@prisma/client/runtime/client.js';
export {PrismaClient} from './generated/client.js';
