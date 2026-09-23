import { z } from 'zod';
import { sportSchema } from '../chat/planning';
const short = z.string().min(1).max(180);
export const prescriptionSchema = z.strictObject({
  exerciseId: z.number().int().positive(), sets: z.number().int().min(1).max(6),
  minReps: z.number().int().min(1).max(30), maxReps: z.number().int().min(1).max(30),
  restSeconds: z.number().int().min(30).max(300), rir: z.number().int().min(2).max(5),
  guidance: short, progression: short,
});
export const programResultSchema = z.strictObject({
  outcome: z.enum(['ready', 'needs_clarification']), title: z.string().min(1).max(70), summary: short,
  blockWeeks: z.literal(4), questions: z.array(short).max(3), assumptions: z.array(short).max(6),
  progression: short,
  sessions: z.array(z.strictObject({
    name: z.string().min(1).max(70), sport: sportSchema, setting: z.enum(['self', 'club']),
    weekday: z.number().int().min(0).max(6), warmupMinutes: z.number().int().min(5).max(15), warmup: short,
    estimatedMinutes: z.number().int().min(10).max(90), exercises: z.array(prescriptionSchema).max(8),
    blocks: z.array(z.strictObject({ title: z.string().min(1).max(70), minutes: z.number().int().min(1).max(90),
      intensity: z.enum(['easy', 'moderate', 'hard']), instruction: short })).max(6),
  })).max(7),
});
export type ProgramResult = z.infer<typeof programResultSchema>;
export const programJsonSchema = z.toJSONSchema(programResultSchema, { target: 'draft-7' });
delete programJsonSchema.$schema;
export function clarification(questions: string[]): ProgramResult {
  return { outcome: 'needs_clarification', title: 'On cale les derniers détails ?', summary: 'Deux mots et je prépare ta semaine.',
    blockWeeks: 4, questions: questions.slice(0, 3), assumptions: [], progression: 'On avance à ton rythme.', sessions: [] };
}
