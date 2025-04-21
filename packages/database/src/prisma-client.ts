import {isRuntimeEnv, RuntimeEnv} from '@augment-vir/common';

export {PrismaClient} from '@prisma/client';

if (isRuntimeEnv(RuntimeEnv.Web)) {
    throw new Error('PrismaClient cannot be imported into the frontend (yet).');
}
