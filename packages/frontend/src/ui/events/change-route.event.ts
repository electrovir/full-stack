import {type FrontendFullRoute} from '@evir/common';
import {defineTypedEvent} from 'element-vir';

export const ChangeRouteEvent = defineTypedEvent<
    Partial<FrontendFullRoute> & {
        /** Replace the current route. */
        replace?: boolean | undefined;
        scrollToTop?: boolean | undefined;
    }
>()('change-route');
