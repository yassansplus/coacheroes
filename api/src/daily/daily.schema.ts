import { z } from 'zod';
export const timezoneSchema = z.string().max(100).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } });
export const dailyDataSchema = z.strictObject({
  weightKg: z.number().min(30).max(350).nullable(), weightSkipped: z.boolean(),
  sleepMinutes: z.number().int().min(0).max(1440), sleepQuality: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5), soreness: z.enum(['none', 'light', 'strong']),
  pains: z.array(z.string().regex(/^(left|right)_(shoulder|elbow|wrist|back|hip|knee|ankle|heel|other)$/)).max(18),
}).refine(v => v.weightSkipped ? v.weightKg === null : v.weightKg !== null, 'Confirme ton poids ou ignore la pesée.');
export type DailyData = z.infer<typeof dailyDataSchema>;
export const dailyWriteSchema = z.strictObject({ date: z.iso.date(), timezone: timezoneSchema, revision: z.number().int().min(0), requestId: z.uuid(), data: dailyDataSchema, adjustment: z.enum(['none','accepted','declined']), proposalId: z.string().nullable() });
export function localClock(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(now);
  const part = (type:string) => parts.find(p=>p.type===type)!.value;
  return { date:`${part('year')}-${part('month')}-${part('day')}`, hour:Number(part('hour')), minute:Number(part('minute')) };
}
