import { z } from 'zod';

export const nutrientsSchema = z.strictObject({ calories: z.number().nonnegative(), protein: z.number().nonnegative(), carbs: z.number().nonnegative(), fat: z.number().nonnegative() });
const estimatedFoodSchema = z.strictObject({
  id: z.string().regex(/^estimate:[0-9a-f-]{36}$/), name: z.string().min(1).max(180),
  baseUnit: z.enum(['g', 'ml']), per100: nutrientsSchema.extend({
    calories: z.number().min(0).max(1000), protein: z.number().min(0).max(100),
    carbs: z.number().min(0).max(100), fat: z.number().min(0).max(100),
  }), macroSource: z.enum(['estimated', 'web']), sourceUrl: z.url().max(2048).refine(value => /^https?:\/\//i.test(value)).nullable(),
}).refine(food => (food.macroSource === 'web') === Boolean(food.sourceUrl), { message: 'Source nutritionnelle incohérente.' });
export const mealItemSchema = z.strictObject({ id: z.uuid(), foodId: z.string().min(1).max(120), amount: z.number().positive().max(10000), estimatedFood: estimatedFoodSchema.optional() });
export const mealWriteSchema = z.strictObject({
  id: z.uuid(), requestId: z.uuid(), revision: z.number().int().nonnegative(), date: z.iso.date(),
  moment: z.enum(['Matin', 'Midi', 'Collation', 'Soir']), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  source: z.enum(['manual', 'text', 'photo']), description: z.string().max(2000).optional(),
  photoId: z.uuid().optional(),
  items: z.array(mealItemSchema).min(1).max(50),
});
export type MealWrite = z.infer<typeof mealWriteSchema>;
