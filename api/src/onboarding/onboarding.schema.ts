import { z } from 'zod';
const strings = z.array(z.string().trim().min(1).max(100)).max(50).refine(v => new Set(v).size === v.length, 'Valeurs dupliquées.');
const numericText = z.string().max(8).regex(/^(?:\d+(?:[.,]\d+)?)?$/);
const numberIn = (v: string, min: number, max: number) => v !== '' && Number(v.replace(',', '.')) >= min && Number(v.replace(',', '.')) <= max;
const pain = z.string().regex(/^(left|right)_(shoulder|elbow|wrist|back|hip|knee|ankle|heel|other)$/);
export const profileSchema = z.strictObject({
  goal: z.array(z.enum(['fat-loss', 'muscle', 'recomposition', 'performance'])).max(4),
  age: numericText, height: numericText, weight: numericText, gender: z.enum(['male', 'female', 'other']),
  level: z.enum(['beginner', 'intermediate', 'experienced', 'advanced']).nullable(),
  performances: z.array(z.strictObject({ id: z.string().min(1).max(100), label: z.string().min(1).max(100),
    value: z.number().min(0).max(500).nullable(), unit: z.enum(['kg', 'rep.']) }).refine(p => p.unit !== 'rep.' || p.value === null || Number.isInteger(p.value))).max(50),
  sports: z.array(z.enum(['strength', 'running', 'cycling', 'swimming', 'walking', 'yoga', 'pilates', 'football', 'basketball', 'tennis', 'padel', 'boxing', 'crossfit'])).max(13),
  places: z.array(z.enum(['gym', 'home', 'club'])).max(3),
  days: z.array(z.number().int().min(0).max(6)).max(7).refine(v => new Set(v).size === v.length),
  sessions: z.number().int().min(1).max(7), timeOfDay: z.enum(['morning', 'noon', 'evening']), duration: z.enum(['45', '60', '90']),
  gymType: z.enum(['full', 'building', 'home']).nullable(), equipment: strings,
  painSide: z.enum(['left', 'right']), pains: z.array(pain).max(18), painNotes: z.string().max(200), noPain: z.boolean(),
  sleep: z.number().int().min(180).max(720), activity: z.enum(['very-low', 'low', 'moderate', 'high']), steps: z.number().int().min(1000).max(30000),
  meals: z.enum(['2', '3', '4', '5+']), cooking: z.enum(['never', 'sometimes', 'often']), restaurants: z.enum(['0-1', '2-3', '4+']),
  tracking: z.array(z.enum(['none', 'calories', 'macros'])).min(1).max(3).refine(v => !v.includes('none') || v.length === 1),
  likedFoods: strings, avoidedFoods: strings, allergies: z.string().max(100),
  photos: z.strictObject({ front: z.uuid().optional(), side: z.uuid().optional(), back: z.uuid().optional() }),
  measurements: z.strictObject({ waist: numericText, chest: numericText, arms: numericText, thighs: numericText }),
  skippedSteps: z.array(z.union([z.literal(5), z.literal(7), z.literal(8), z.literal(10)])).max(4),
});
export type Profile = z.infer<typeof profileSchema>;
export function completionError(p: Profile): string | null {
  if (!p.goal.length) return 'Choisis au moins un objectif.';
  if (!numberIn(p.age, 18, 100) || !Number.isInteger(Number(p.age.replace(',', '.')))) return 'Indique un âge entre 18 et 100 ans.';
  if (!numberIn(p.height, 100, 250) || !numberIn(p.weight, 30, 350)) return 'Vérifie ta taille et ton poids.';
  if (!p.level || !p.sports.includes('strength') || !p.places.length) return 'Complète ton niveau, tes sports et tes lieux.';
  if (!p.skippedSteps.includes(7) && (!p.days.length || p.sessions > p.days.length)) return 'Vérifie tes disponibilités.';
  if (!p.skippedSteps.includes(8) && !p.gymType) return 'Complète ton matériel ou passe cette étape.';
  if (!p.noPain && !p.pains.length && !p.painNotes.trim()) return 'Complète les informations de douleurs.';
  if (Object.values(p.measurements).some(v => v !== '' && !numberIn(v, 10, 250))) return 'Vérifie tes mensurations.';
  return null;
}
export const saveSchema = z.strictObject({
  profile: profileSchema, currentStep: z.number().int().min(2).max(14), revision: z.number().int().nonnegative(),
  requestId: z.uuid(), occurredAt: z.iso.datetime({ offset: true }),
  timezone: z.string().max(100).refine(value => { try { new Intl.DateTimeFormat('fr', { timeZone: value }); return true; } catch { return false; } }),
});
export type SaveInput = z.infer<typeof saveSchema>;
