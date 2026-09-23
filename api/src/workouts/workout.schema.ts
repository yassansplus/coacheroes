import { z } from 'zod';
const text = z.string().max(500);
const id = z.string().min(1).max(120);
export const setSchema = z.object({ id: z.uuid(), occurredAt: z.iso.datetime(), updatedAt: z.iso.datetime(), weight: z.number().min(0).max(500), reps: z.number().int().min(0).max(100), feeling: z.enum(['easy','correct','hard','failure']).nullable(), warmup: z.boolean() });
const exercise = z.object({ id, name: text, muscle: text, equipment: text, icon: id, weight: z.number().min(0).max(500), minReps: z.number().int().min(0).max(100), maxReps: z.number().int().min(0).max(100), targetReps: z.number().int().min(0).max(100), restSeconds: z.number().min(0).max(3600), rir: z.number().min(0).max(10).optional(), guidance: text.optional(), progression: text.optional(), previous: z.object({ recordWeight:z.number().min(0).max(500).optional(),recordReps:z.number().min(0).max(100).optional(),weight: z.number().min(0).max(500), reps: z.array(z.number().min(0).max(100)).max(50) }), sets: z.array(setSchema.nullable()).max(50) });
export const snapshotSchema = z.object({
  workout: z.object({ id, name: text, description: text, minutes: z.number().min(0).max(1440), day: z.number().int().min(0).max(6), icon: id, kind: z.enum(['strength','free']), generated: z.boolean().optional(), sport: id.optional(), programVersionId: z.uuid().optional(), sessionIndex: z.number().int().min(0).max(6).optional(), week: z.number().int().min(1).max(52).optional(), scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), warmupMinutes: z.number().min(0).max(60).optional(), warmupGuidance: text.optional(), sportBlocks: z.array(z.object({ title: text, minutes: z.number().min(0).max(1440), intensity: z.enum(['easy','moderate','hard']), instruction: text })).max(20).optional() }),
  exercises: z.array(exercise).max(30), startedAt: z.number().int().positive(), endedAt: z.number().int().positive().nullable(),
  status: z.enum(['in_progress','completed','abandoned']), timezone: z.string().min(1).max(100),
  debrief: z.object({ energy: z.enum(['1','2','3','4','5']), difficulty: z.enum(['easy','adapted','hard']), pain: z.boolean(), comment: z.string().max(500) }),
  painReports: z.array(z.object({ id: z.uuid(), occurredAt: z.iso.datetime(), exerciseId: id, zones: z.array(z.string().max(40)).max(40), intensity: z.number().int().min(1).max(5), timing: text, note: text })).max(50),
  sportMetrics: z.object({ durationSeconds: z.number().int().min(0).max(172800).nullable(), distanceMeters: z.number().min(0).max(1000000).nullable(), rounds: z.number().int().min(0).max(1000).nullable(), intensity: z.enum(['easy','moderate','hard']).nullable() }),
  resume: z.object({ page: z.enum(['warmup','training','rest','debrief','summary','coach']), exerciseIndex: z.number().int().min(0).max(29), deadline: z.number().nullable(), timerDuration: z.number().min(0).max(86400), rir: z.number().min(0).max(10), autoRest: z.boolean(), guidedWarmup: z.boolean(), restHaptics: z.boolean() }),
}).superRefine((s, ctx) => {
  if ((s.endedAt !== null && s.endedAt < s.startedAt) || (s.status !== 'in_progress' && s.endedAt === null)) ctx.addIssue({ code: 'custom', message: 'Horaires incohérents.' });
  const sets = s.exercises.flatMap(e => e.sets.filter(v => v !== null));
  if (new Set(sets.map(s => s.id)).size !== sets.length || new Set(s.exercises.map(e=>e.id)).size !== s.exercises.length) ctx.addIssue({ code:'custom', message:'Identifiants dupliqués.' });
});
export const writeSchema = z.strictObject({ requestId: z.uuid(), revision: z.number().int().min(0), snapshot: snapshotSchema });
export type WorkoutSnapshot = z.infer<typeof snapshotSchema>;
export type WorkoutWrite = z.infer<typeof writeSchema>;
export function summarizeWorkout(s: WorkoutSnapshot) {
  const sets = s.exercises.flatMap(e=>e.sets.filter(v=>v && !v.warmup));
  return { xp:s.status==='completed'?(s.workout.kind==='free'?80:sets.length*16):0,records:0,durationSeconds: Math.max(0, Math.floor(((s.endedAt ?? s.startedAt)-s.startedAt)/1000)), sets:sets.length,
    volume:sets.reduce((n,v)=>n+v!.weight*v!.reps,0), completedExercises:s.exercises.filter(e=>e.sets.length && e.sets.every(Boolean)).length,
    pain:s.debrief.pain || s.painReports.length>0, energy:Number(s.debrief.energy), difficulty:s.debrief.difficulty, comment:s.debrief.comment };
}
