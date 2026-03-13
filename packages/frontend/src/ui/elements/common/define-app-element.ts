import {wrapDefineElement} from 'element-vir';
import {handleError} from 'sentry-vir';

export const appTagPrefix = 'app-';
export type AppTag = `${typeof appTagPrefix}${string}`;

export const defineAppElement = wrapDefineElement<AppTag>({
    transformInputs(init) {
        return {
            ...init,
            options: {
                errorHandler(error) {
                    handleError(error, {
                        context: {
                            tagName: init.tagName,
                        },
                    });
                },
            },
        };
    },
});
