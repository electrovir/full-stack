import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {type Team} from '../database-exports-for-common.js';
import {type MakeMissingFieldsOptional} from './optional-fields.js';

describe('MakeMissingFieldsOptional', () => {
    it('leaves primitives', () => {
        const value = {} as any as MakeMissingFieldsOptional<string, string>;
        assert.tsType(value).equals<string>();
    });
    it('leaves primitives in objects', () => {
        const value = {} as any as MakeMissingFieldsOptional<{a: string; b: string}, {a: string}>;
        assert.tsType(value).equals<{a: string; b?: string}>();
    });
    it('leaves ID types', () => {
        const value = {} as any as MakeMissingFieldsOptional<
            {a: Team['id']; b: string},
            {a: Team['id']}
        >;
        assert.tsType(value).equals<{a: Team['id']; b?: string}>();
    });
});
