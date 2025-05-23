import {createPrismaMapExtension, type PrismaValueMapper} from 'prisma-map';

const mappers: ReadonlyArray<PrismaValueMapper> = [
    (value) => {
        if (value instanceof Date) {
            return {
                replacement: value.toISOString(),
            };
        } else {
            return undefined;
        }
    },
];

export const prismaMapExtension = createPrismaMapExtension(mappers);
