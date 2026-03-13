import {type FrontendRoute} from '@evir/common';
import {defineTypedEvent} from 'element-vir';

export const ChangeRouteEvent = defineTypedEvent<
    Partial<FrontendRoute> & {
        /** If true, the current route is replaced. */
        replace?: boolean | undefined;
        scrollToTop?: boolean | undefined;
    }
>()('change-route');
