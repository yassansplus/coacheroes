import { z } from 'zod';
export const sportSchema = z.enum(['strength', 'running', 'cycling', 'swimming', 'walking', 'yoga', 'pilates', 'football', 'basketball', 'tennis', 'padel', 'boxing', 'crossfit']);
export const weekdaysSchema = z.array(z.number().int().min(0).max(6)).max(7).refine(v => new Set(v).size === v.length);
export const coachingDetailsSchema = z.object({
  schedules: z.array(z.object({ sport: sportSchema, mode: z.enum(['coach', 'fixed']), weekdays: weekdaysSchema, minutes: z.number().int().min(15).max(90).nullable() })).default([]),
  notes: z.array(z.string().max(2000)).max(10).default([]),
  restrictionNotes: z.string().max(2000).nullable().default(null),
});
export type CoachingDetails = z.infer<typeof coachingDetailsSchema>;
export const sportLabels: Record<z.infer<typeof sportSchema>, string> = { strength: 'muscu', boxing: 'boxe', running: 'course', cycling: 'vélo', swimming: 'natation', walking: 'marche', yoga: 'yoga', pilates: 'pilates', football: 'foot', basketball: 'basket', tennis: 'tennis', padel: 'padel', crossfit: 'crossfit' };
