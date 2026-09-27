import { z } from 'zod';
import { timezoneSchema } from '../daily/daily.schema';

export const progressDateSchema = z.iso.date();
const common = { requestId: z.uuid(), revision: z.number().int().nonnegative(), timezone: timezoneSchema };
export const weightSchema = z.strictObject({ ...common, value: z.number().min(30).max(350) });
export const measurementSchema = z.strictObject({ ...common,
  waist: z.number().min(10).max(300).nullable(), chest: z.number().min(10).max(300).nullable(),
  arm: z.number().min(10).max(300).nullable(), thigh: z.number().min(10).max(300).nullable(),
}).refine(value => [value.waist, value.chest, value.arm, value.thigh].some(item => item !== null));
export const photoSchema = z.strictObject({ ...common,
  images: z.strictObject({ face: z.uuid().optional(), profile: z.uuid().optional(), back: z.uuid().optional() })
    .refine(value => Object.keys(value).length > 0),
});
export const photoRemoveSchema = z.strictObject(common);
export const boxingSchema = z.strictObject({ ...common, value: z.number().int().min(1).max(100000) });
export const photoAngleSchema = z.enum(['face', 'profile', 'back']);
export const boxingKindSchema = z.enum(['Sac', 'Corde', 'Sparring']);
