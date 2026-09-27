import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { coachingDetailsSchema } from '../chat/planning';
import { Onboarding } from '../database/entities';
import { ProgramBlock, WorkoutSession } from '../workouts/workout.entity';
import { profileSchema } from '../onboarding/onboarding.schema';
import { weightTimeline } from '../progression/weight-timeline';

@Injectable()
export class RenewalSummary {
  constructor(private readonly db: DataSource) {}

  async history(userId: string) {
    const blocks = await this.db.getRepository(ProgramBlock).find({ where: { userId }, order: { startedAt: 'DESC' } });
    return blocks.map(block => ({ id: block.id, title: (block.prescription as any).output?.result?.title ?? 'Programme',
      startedAt: block.startedAt, endsAt: block.endsAt, weeks: ((block.prescription as any).output?.result?.blockWeeks ?? 4) + block.extensions }));
  }

  async get(userId: string, id: string, manager: EntityManager = this.db.manager) {
    const block = await manager.findOneBy(ProgramBlock, { id, userId });
    if (!block) throw new NotFoundException('Programme introuvable.');
    const onboarding = await manager.findOneByOrFail(Onboarding, { userId });
    const profile = profileSchema.parse(onboarding.profile);
    const coaching = coachingDetailsSchema.parse(onboarding.coachingDetails);
    const sessions = await manager.find(WorkoutSession, { where: { userId, programVersionId: id }, order: { startedAt: 'ASC' } });
    const completed = sessions.filter(s => s.status === 'completed');
    const prescribed = (block.prescription as any).output?.result;
    const weeks = (prescribed?.blockWeeks ?? 4) + block.extensions;
    const weekOf = (session: WorkoutSession) => session.snapshot.workout.week ??
      Math.floor((session.startedAt.getTime() - block.startedAt.getTime()) / 604800000) + 1;
    const weekly = Array.from({ length: weeks }, (_, index) => ({ week: index + 1, planned: prescribed?.sessions?.length ?? 0,
      completed: completed.filter(session => weekOf(session) === index + 1).length,
      painSessions: sessions.filter(session => weekOf(session) === index + 1 && session.status !== 'in_progress' && Boolean(session.summary.pain)).length }));
    const bySport: Record<string, number> = {};
    const exerciseSets = new Map<string, { name: string; first: { date: string; weightKg: number; reps: number }; last: { date: string; weightKg: number; reps: number }; sessions: number }>();
    for (const session of completed) {
      const sport = session.snapshot.workout.sport ?? session.snapshot.workout.kind;
      bySport[sport] = (bySport[sport] ?? 0) + 1;
      for (const exercise of session.snapshot.exercises) {
        const sets = exercise.sets.filter(set => set && !set.warmup);
        if (!sets.length) continue;
        const top = [...sets].sort((a, b) => (b!.weight * b!.reps) - (a!.weight * a!.reps))[0]!;
        const entry = { date: session.startedAt.toISOString().slice(0, 10), weightKg: top.weight, reps: top.reps };
        const current = exerciseSets.get(exercise.id);
        if (current) { current.last = entry; current.sessions++; }
        else exerciseSets.set(exercise.id, { name: exercise.name, first: entry, last: entry, sessions: 1 });
      }
    }
    const daily = await manager.query(`SELECT date::text AS date, data FROM daily_check_ins
      WHERE user_id=$1 AND completed_at IS NOT NULL AND date >= $2::date AND date <= $3::date ORDER BY date ASC`,
      [userId, block.startedAt.toISOString().slice(0, 10), block.endsAt.toISOString().slice(0, 10)]) as { date: string; data: Record<string, unknown> }[];
    const allWeights = await weightTimeline(manager, userId);
    const weights = allWeights.filter(row => row.date >= block.startedAt.toISOString().slice(0, 10) && row.date <= block.endsAt.toISOString().slice(0, 10)).map(row => ({ date: row.date, kg: row.value }));
    const recentWeight = allWeights.at(-1) ? { date: allWeights.at(-1)!.date, kg: allWeights.at(-1)!.value } : undefined;
    const average = (key: string) => { const values = daily.map(row => row.data?.[key]).filter((v): v is number => typeof v === 'number');
      return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null; };
    const summary = {
      id, title: prescribed?.title ?? 'Programme', startedAt: block.startedAt, endsAt: block.endsAt, weeks,
      due: block.endsAt.getTime() <= Date.now(), planned: (prescribed?.sessions?.length ?? 0) * weeks,
      completed: completed.length, abandoned: sessions.filter(s => s.status === 'abandoned').length,
      durationMinutes: Math.round(completed.reduce((sum, session) => sum + Number(session.summary.durationSeconds ?? 0), 0) / 60),
      volumeKg: Math.round(completed.reduce((sum, session) => sum + Number(session.summary.volume ?? 0), 0)),
      painSessions: sessions.filter(session => session.status !== 'in_progress' && Boolean(session.summary.pain)).length, bySport, weekly,
      exercises: [...exerciseSets.entries()].map(([id, value]) => ({ id, ...value })),
      weight: { onboardingKg: Number(String((block.prescription as any).context?.physical?.weightKg ?? profile.weight).replace(',', '.')),
        entries: weights, first: weights[0] ?? null, last: weights.at(-1) ?? null, latestKnown: recentWeight ?? null },
      recovery: { checkIns: daily.length, sleepMinutes: average('sleepMinutes'), energy: average('energy'), soreness: daily.filter(row => row.data?.soreness === 'strong').length },
      workouts: sessions.map(session => ({ id: session.id, startedAt: session.startedAt, status: session.status,
        week: session.snapshot.workout.week ?? null, name: session.snapshot.workout.name,
        sport: session.snapshot.workout.sport ?? session.snapshot.workout.kind,
        summary: session.summary, exercises: session.snapshot.exercises.map(exercise => ({ id: exercise.id, name: exercise.name,
          sets: exercise.sets.filter(set => set && !set.warmup).map(set => ({ weightKg: set!.weight, reps: set!.reps, feeling: set!.feeling })) })) })),
    };
    return { summary, profileRevision: onboarding.revision,
      answers: { goals: profile.goal, sports: profile.sports, places: profile.places, days: profile.days,
        sessions: profile.sessions, duration: profile.duration, timeOfDay: profile.timeOfDay, gymType: profile.gymType,
        equipment: profile.equipment, schedules: coaching.schedules.filter(schedule => profile.sports.includes(schedule.sport)),
        noPain: profile.noPain, pains: profile.pains, painNotes: profile.painNotes,
        weightKg: recentWeight && Date.now() - Date.parse(`${recentWeight.date}T00:00:00Z`) < 7 * 86400000 ? recentWeight.kg : null,
        effort: 'balanced', feedback: '' },
      review: block.renewalReview };
  }
}
