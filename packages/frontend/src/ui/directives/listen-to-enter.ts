import {type MaybePromise} from '@augment-vir/common';
import {listen} from 'element-vir';

/** Listen to `'Enter'` or `'Return'` or `'NumpadEnter'` key presses and fire the given callback. */
export function listenToEnter(callback: () => MaybePromise<void>) {
    return listen('keydown', async (event) => {
        const key = event.key.toLowerCase();
        if (key.includes('enter') || key.includes('return')) {
            await callback();
        }
    });
}
