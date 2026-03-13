import {describe, it} from '@augment-vir/test';

describe('for backend', () => {
    it('can be imported', async () => {
        await import('./for-backend.js');
    });
});
