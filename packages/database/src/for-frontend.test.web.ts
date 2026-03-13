import {describe, it} from '@augment-vir/test';

describe('for frontend', () => {
    it('can be imported', async () => {
        await import('./for-frontend.js');
    });
});
