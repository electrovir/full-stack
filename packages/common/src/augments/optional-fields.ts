import {type AnyObject, type ArrayElement} from '@augment-vir/common';
import {type Primitive, type SetOptional} from 'type-fest';

export type MakeMissingFieldsOptional<Wide, Narrow> = Wide extends Primitive
    ? Wide
    : Narrow extends any[]
      ? Wide extends any[]
          ? MakeMissingFieldsOptional<ArrayElement<Wide>, ArrayElement<Narrow>>[]
          : never
      : Narrow extends AnyObject
        ? SetOptional<
              {[Key in keyof Wide]: MakeMissingFieldsOptional<Wide[Key], Narrow[Key]>},
              Exclude<keyof Wide, keyof Narrow>
          >
        : Wide;
