import { z } from 'zod';
import { sportSchema, weekdaysSchema } from '../chat/planning';

export const renewalAnswersSchema = z.strictObject({
  goals: z.array(z.enum(['fat-loss', 'muscle', 'recomposition', 'performance'])).min(1).max(4),
  sports: z.array(sportSchema).min(1).max(13).refine(v => v.includes('strength') && new Set(v).size === v.length),
  places: z.array(z.enum(['gym', 'home', 'club'])).min(1).max(3),
  days: weekdaysSchema.min(1), sessions: z.number().int().min(1).max(7),
  duration: z.enum(['45', '60', '90']), timeOfDay: z.enum(['morning', 'noon', 'evening']),
  gymType: z.enum(['full', 'building', 'home']).nullable(),
  equipment: z.array(z.string().trim().min(1).max(100)).max(50),
  schedules: z.array(z.strictObject({ sport: sportSchema, mode: z.enum(['coach', 'fixed']), weekdays: weekdaysSchema,
    minutes: z.number().int().min(15).max(90).nullable() })).max(12),
  noPain: z.boolean(), pains: z.array(z.string().regex(/^(left|right)_(shoulder|elbow|wrist|back|hip|knee|ankle|heel|other)$/)).max(18),
  painNotes: z.string().max(200), weightKg: z.number().min(30).max(350).nullable(),
  effort: z.enum(['easy', 'balanced', 'hard']), feedback: z.string().trim().max(500),
}).superRefine((value, ctx) => {
  if (value.sessions > value.days.length) ctx.addIssue({ code: 'custom', message: 'Choisis assez de jours pour tes séances.' });
  if (!value.places.includes('gym') && !value.places.includes('home')) ctx.addIssue({ code: 'custom', message: 'Précise où tu fais ta musculation.' });
  if (!value.noPain && !value.painNotes.trim()) ctx.addIssue({ code: 'custom', message: 'Précise les mouvements qui te gênent.' });
  if (value.schedules.some(s => s.sport === 'strength' || !value.sports.includes(s.sport)) || new Set(value.schedules.map(s => s.sport)).size !== value.schedules.length)
    ctx.addIssue({ code: 'custom', message: 'Vérifie les sports complémentaires.' });
  if (value.schedules.some(s => s.mode === 'fixed' && (!s.weekdays.length || s.minutes === null || s.weekdays.some(day => !value.days.includes(day)))))
    ctx.addIssue({ code: 'custom', message: 'Vérifie les jours et durées des cours fixes.' });
});
export type RenewalAnswers = z.infer<typeof renewalAnswersSchema>;
export const renewalRequestSchema = z.strictObject({ blockId: z.uuid(), profileRevision: z.number().int().min(0), requestId: z.uuid(), answers: renewalAnswersSchema, regenerate: z.boolean().optional() });
