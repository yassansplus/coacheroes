import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import type { z } from 'zod';
import { JournalEntry, Onboarding, OnboardingPhoto, User } from '../database/entities';
import { localClock } from '../daily/daily.schema';
import { ProgramBlock, WorkoutSession } from '../workouts/workout.entity';
import { weightTimeline } from './weight-timeline';
import { boxingSchema, measurementSchema, photoRemoveSchema, photoSchema, weightSchema } from './progression.schema';

type Common = { requestId: string; revision: number; timezone: string };
type Angle = 'face' | 'profile' | 'back';
type Kind = 'Sac' | 'Corde' | 'Sparring';
const asDate = (date: Date, timezone: string) => {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
  catch { return date.toISOString().slice(0, 10); }
};
const number = (value: unknown) => value === null || value === undefined ? null : Number(value);
const day = (date: Date) => date.toISOString().slice(0, 10);

@Injectable()
export class ProgressionService {
  constructor(private readonly db: DataSource) {}

  async get(userId: string) {
    const manager = this.db.manager;
    const [onboarding, completion, weights, measures, photos, tests, daily, blocks, workouts] = await Promise.all([
      manager.findOneBy(Onboarding, { userId }),
      manager.findOne(JournalEntry, { where: { userId, type: 'onboarding.completed' }, order: { recordedAt: 'ASC' } }),
      weightTimeline(manager, userId),
      manager.query(`SELECT date::text AS date, waist_cm AS waist, chest_cm AS chest, arm_cm AS arm, thigh_cm AS thigh, revision FROM progression_measurements WHERE user_id=$1 ORDER BY date ASC`, [userId]),
      manager.query(`SELECT id, date::text AS date, images, revision FROM progression_photos WHERE user_id=$1 AND images<>'{}'::jsonb ORDER BY date ASC`, [userId]),
      manager.query(`SELECT id, date::text AS date, kind, value, revision FROM progression_boxing_tests WHERE user_id=$1 ORDER BY date ASC, kind ASC`, [userId]),
      manager.query(`SELECT date::text AS date, data FROM daily_check_ins WHERE user_id=$1 AND completed_at IS NOT NULL ORDER BY date ASC`, [userId]),
      manager.find(ProgramBlock, { where: { userId }, order: { startedAt: 'ASC' } }),
      manager.find(WorkoutSession, { where: { userId }, order: { startedAt: 'ASC' } }),
    ]);
    const [preference] = await manager.query(`SELECT timezone FROM daily_preferences WHERE user_id=$1`, [userId]);
    const dateToday = localClock(preference?.timezone ?? 'UTC').date;
    const actual = workouts.map(workout => {
      const timezone = workout.snapshot.timezone || 'UTC';
      return { id: workout.id, date: asDate(workout.startedAt, timezone), sport: workout.snapshot.workout.sport ?? workout.snapshot.workout.kind,
        name: workout.snapshot.workout.name, status: workout.status, minutes: workout.status === 'completed' ? Math.round(Number(workout.summary.durationSeconds ?? 0) / 60) : null,
        rounds: workout.status === 'completed' ? workout.snapshot.sportMetrics?.rounds ?? null : null,
        programVersionId: workout.programVersionId, sessionIndex: workout.snapshot.workout.sessionIndex ?? null,
        week: workout.snapshot.workout.week ?? null, scheduledDate: workout.snapshot.workout.scheduledDate ?? null };
    });
    const matched = new Set<string>();
    const sessions: Record<string, unknown>[] = [];
    for (const block of blocks) {
      const program = (block.prescription as any).output?.result;
      const templates = program?.sessions ?? [];
      const weeks = (program?.blockWeeks ?? 4) + block.extensions;
      for (let week = 1; week <= weeks; week++) for (let index = 0; index < templates.length; index++) {
        const template = templates[index];
        const scheduled = new Date(block.startedAt);
        const mondayOffset = (scheduled.getUTCDay() + 6) % 7;
        scheduled.setUTCDate(scheduled.getUTCDate() + ((template.weekday - mondayOffset + 7) % 7) + (week - 1) * 7);
        const date = day(scheduled);
        const candidates = actual.filter(item => item.programVersionId === block.id && item.sessionIndex === index && (item.week === week || item.scheduledDate === date));
        const chosen = candidates.find(item => item.status === 'completed') ?? candidates.find(item => item.status === 'in_progress') ?? candidates.find(item => item.status === 'abandoned');
        if (chosen) matched.add(chosen.id);
        sessions.push({ id: chosen?.id ?? `${block.id}-${week}-${index}`, date, sport: template.sport ?? 'strength', name: template.name ?? 'Séance',
          status: chosen?.status ?? (date < dateToday ? 'missed' : 'planned'), minutes: chosen?.minutes ?? null, rounds: chosen?.rounds ?? null });
      }
      const scheduledDays = new Set(sessions.filter(item => String(item.id).startsWith(block.id) || actual.some(workout => workout.programVersionId === block.id && workout.id === item.id)).map(item => String(item.date)));
      const first = new Date(block.startedAt); first.setUTCHours(0, 0, 0, 0);
      for (let offset = 0; offset < weeks * 7; offset++) {
        const date = new Date(first); date.setUTCDate(date.getUTCDate() + offset);
        const key = day(date);
        if (key >= day(block.endsAt)) break;
        if (!scheduledDays.has(key)) sessions.push({ id: `${block.id}-rest-${key}`, date: key, sport: 'rest', name: 'Repos planifié', status: 'rest', minutes: null, rounds: null });
      }
    }
    for (const item of actual) if (!matched.has(item.id)) sessions.push({ id: item.id, date: item.date, sport: item.sport, name: item.name,
      status: item.status, minutes: item.minutes, rounds: item.rounds });
    sessions.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));

    const exerciseMap = new Map<string, { id: string; title: string; points: { date: string; weight: number; reps: number; volume: number; estimatedMax: number | null; baseline?: boolean }[] }>();
    for (const workout of workouts) {
      if (workout.status !== 'completed') continue;
      const date = asDate(workout.startedAt, workout.snapshot.timezone || 'UTC');
      for (const exercise of workout.snapshot.exercises) {
        const sets = exercise.sets.filter((set): set is NonNullable<typeof set> => !!set && !set.warmup);
        if (!sets.length) continue;
        const top = sets.reduce((best, current) => current.weight > best.weight || current.weight === best.weight && current.reps > best.reps ? current : best);
        const volume = sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
        const max = Math.max(...sets.filter(set => set.weight > 0 && set.reps >= 1 && set.reps <= 10).map(set => set.weight * (1 + set.reps / 30)), 0);
        const entry = exerciseMap.get(exercise.id) ?? { id: exercise.id, title: exercise.name, points: [] };
        entry.title = exercise.name;
        const previous = entry.points.find(point => point.date === date);
        if (previous) {
          previous.volume += volume;
          if (top.weight > previous.weight || top.weight === previous.weight && top.reps > previous.reps) { previous.weight = top.weight; previous.reps = top.reps; }
          previous.estimatedMax = max ? Math.max(previous.estimatedMax ?? 0, max) : previous.estimatedMax;
        } else entry.points.push({ date, weight: top.weight, reps: top.reps, volume, estimatedMax: max || null });
        exerciseMap.set(exercise.id, entry);
      }
    }
    const initial = (blocks[0]?.prescription as any)?.context?.experience?.performances ?? (onboarding?.profile as any)?.performances ?? [];
    const baselineDate = onboarding?.completedAt ? asDate(onboarding.completedAt, String(completion?.payload?.timezone ?? 'UTC')) : weights[0]?.date ?? dateToday;
    for (const entry of initial as { id: string; label: string; value: number | null; unit: string }[]) {
      if (entry.value === null || !Number.isFinite(entry.value) || exerciseMap.has(entry.id)) continue;
      exerciseMap.set(entry.id, { id: entry.id, title: entry.label, points: [{ date: baselineDate,
        weight: entry.unit === 'kg' ? entry.value : 0, reps: entry.unit === 'rep.' ? entry.value : 0,
        volume: 0, estimatedMax: null, baseline: true }] });
    }
    const exercises = [...exerciseMap.values()].map(item => ({ ...item, unit: item.points.some(point => point.weight > 0) ? 'kg' : 'rep.' }));
    const progressWeights = await manager.query(`SELECT date::text AS date, revision FROM progression_weights WHERE user_id=$1`, [userId]);
    const revisions = new Map((progressWeights as { date: string; revision: number }[]).map(item => [item.date, item.revision]));
    const sleep = (daily as { date: string; data: any }[]).flatMap(row => typeof row.data?.sleepMinutes === 'number' ? [{ date: row.date, minutes: row.data.sleepMinutes, quality: row.data.sleepQuality }] : []);
    const activeBlock = blocks.at(-1);
    return { startDate: onboarding?.completedAt ? baselineDate : null,
      block: activeBlock ? { startedAt: activeBlock.startedAt, endsAt: activeBlock.endsAt } : null,
      weights: weights.map(item => ({ ...item, revision: revisions.get(item.date) ?? 0 })),
      measures: (measures as any[]).map(item => ({ ...item, waist: number(item.waist), chest: number(item.chest), arm: number(item.arm), thigh: number(item.thigh) })),
      photos, tests, sessions, exercises, sleep };
  }

  private async change(userId: string, date: string, type: string, input: Common, payload: unknown,
    perform: (manager: EntityManager) => Promise<{ before: unknown; after: unknown }>) {
    if (date > localClock(input.timezone).date) throw new BadRequestException('Choisis une date passée ou aujourd’hui.');
    const hash = createHash('sha256').update(JSON.stringify({ date, type, payload, revision: input.revision })).digest('hex');
    return this.db.transaction(async manager => {
      await manager.findOneOrFail(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
      const [receipt] = await manager.query(`SELECT payload_hash FROM progression_write_receipts WHERE user_id=$1 AND request_id=$2`, [userId, input.requestId]);
      if (receipt) { if (receipt.payload_hash !== hash) throw new ConflictException('Identifiant de sauvegarde déjà utilisé.'); return { ok: true }; }
      const { before, after } = await perform(manager);
      await manager.query(`INSERT INTO progression_write_receipts(user_id,request_id,payload_hash) VALUES($1,$2,$3)`, [userId, input.requestId, hash]);
      await manager.save(JournalEntry, manager.create(JournalEntry, { userId, requestId: input.requestId, type, occurredAt: new Date(),
        payload: { date, before, after } }));
      return { ok: true };
    });
  }

  weight(userId: string, date: string, input: z.infer<typeof weightSchema>) {
    return this.change(userId, date, 'progression.weight.saved', input, { value: input.value }, async manager => {
      const [before] = await manager.query(`SELECT value_kg, revision FROM progression_weights WHERE user_id=$1 AND date=$2 FOR UPDATE`, [userId, date]);
      if ((before?.revision ?? 0) !== input.revision) throw new ConflictException('Cette pesée a changé. Recharge les données.');
      const [after] = await manager.query(`INSERT INTO progression_weights(user_id,date,value_kg,source) VALUES($1,$2,$3,'manual')
        ON CONFLICT(user_id,date) DO UPDATE SET value_kg=EXCLUDED.value_kg,source='manual',revision=progression_weights.revision+1,updated_at=now()
        RETURNING value_kg,revision`, [userId, date, input.value]);
      return { before: before ?? null, after };
    });
  }

  measurement(userId: string, date: string, input: z.infer<typeof measurementSchema>) {
    const values = [input.waist, input.chest, input.arm, input.thigh];
    return this.change(userId, date, 'progression.measurements.saved', input, values, async manager => {
      const [before] = await manager.query(`SELECT waist_cm,chest_cm,arm_cm,thigh_cm,revision FROM progression_measurements WHERE user_id=$1 AND date=$2 FOR UPDATE`, [userId, date]);
      if ((before?.revision ?? 0) !== input.revision) throw new ConflictException('Ces mesures ont changé. Recharge les données.');
      const [after] = await manager.query(`INSERT INTO progression_measurements(user_id,date,waist_cm,chest_cm,arm_cm,thigh_cm) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(user_id,date) DO UPDATE SET waist_cm=EXCLUDED.waist_cm,chest_cm=EXCLUDED.chest_cm,arm_cm=EXCLUDED.arm_cm,thigh_cm=EXCLUDED.thigh_cm,
          revision=progression_measurements.revision+1,updated_at=now() RETURNING waist_cm,chest_cm,arm_cm,thigh_cm,revision`, [userId, date, ...values]);
      return { before: before ?? null, after };
    });
  }

  photo(userId: string, date: string, input: z.infer<typeof photoSchema>) {
    return this.change(userId, date, 'progression.photos.saved', input, input.images, async manager => {
      const ids = Object.values(input.images);
      if (await manager.countBy(OnboardingPhoto, { userId, id: In(ids) }) !== ids.length)
        throw new BadRequestException('Une photo ne correspond pas à ton compte.');
      const [before] = await manager.query(`SELECT id,images,revision FROM progression_photos WHERE user_id=$1 AND date=$2 FOR UPDATE`, [userId, date]);
      if ((before?.revision ?? 0) !== input.revision) throw new ConflictException('Ces photos ont changé. Recharge les données.');
      const images = { ...(before?.images ?? {}), ...input.images };
      const [after] = await manager.query(`INSERT INTO progression_photos(user_id,date,images) VALUES($1,$2,$3)
        ON CONFLICT(user_id,date) DO UPDATE SET images=EXCLUDED.images,revision=progression_photos.revision+1,updated_at=now() RETURNING id,images,revision`, [userId, date, JSON.stringify(images)]);
      return { before: before ?? null, after };
    });
  }

  removePhoto(userId: string, date: string, angle: Angle, input: z.infer<typeof photoRemoveSchema>) {
    return this.change(userId, date, 'progression.photo.removed', input, { angle }, async manager => {
      const [before] = await manager.query(`SELECT id,images,revision FROM progression_photos WHERE user_id=$1 AND date=$2 FOR UPDATE`, [userId, date]);
      if (!before?.images?.[angle]) throw new NotFoundException('Photo introuvable.');
      if (before.revision !== input.revision) throw new ConflictException('Ces photos ont changé. Recharge les données.');
      const images = { ...before.images }; delete images[angle];
      const [after] = await manager.query(`UPDATE progression_photos SET images=$3,revision=revision+1,updated_at=now() WHERE user_id=$1 AND date=$2 RETURNING id,images,revision`, [userId, date, JSON.stringify(images)]);
      return { before, after };
    });
  }

  boxing(userId: string, date: string, kind: Kind, input: z.infer<typeof boxingSchema>) {
    return this.change(userId, date, 'progression.boxing_test.saved', input, { kind, value: input.value }, async manager => {
      const [before] = await manager.query(`SELECT id,value,revision FROM progression_boxing_tests WHERE user_id=$1 AND date=$2 AND kind=$3 FOR UPDATE`, [userId, date, kind]);
      if ((before?.revision ?? 0) !== input.revision) throw new ConflictException('Ce test a changé. Recharge les données.');
      const [after] = await manager.query(`INSERT INTO progression_boxing_tests(user_id,date,kind,value) VALUES($1,$2,$3,$4)
        ON CONFLICT(user_id,date,kind) DO UPDATE SET value=EXCLUDED.value,revision=progression_boxing_tests.revision+1,updated_at=now() RETURNING id,value,revision`, [userId, date, kind, input.value]);
      return { before: before ?? null, after };
    });
  }
}
