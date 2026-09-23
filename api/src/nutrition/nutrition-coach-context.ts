import { Injectable } from '@nestjs/common';
import { DataSource, Between, IsNull } from 'typeorm';
import { Onboarding, User } from '../database/entities';
import { anonymousData } from '../workouts/ai-context';
import { WorkoutSession } from '../workouts/workout.entity';
import { NutritionMeal } from './nutrition.entity';

function dateKey(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const part = (type: string) => parts.find(value => value.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch { return date.toISOString().slice(0, 10); }
}

@Injectable()
export class NutritionCoachContext {
  constructor(private readonly db: DataSource) {}

  async sevenDayJournal(userId: string, throughDate: string) {
    const end = new Date(`${throughDate}T00:00:00.000Z`);
    const dates = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(end); day.setUTCDate(day.getUTCDate() - (6 - index)); return day.toISOString().slice(0, 10);
    });
    const first = dates[0];
    const [meals, workouts, user] = await Promise.all([
      this.db.getRepository(NutritionMeal).find({ where: { userId, date: Between(first, throughDate), deletedAt: IsNull() }, order: { date: 'ASC', createdAt: 'ASC' } }),
      this.db.getRepository(WorkoutSession).find({ where: { userId, startedAt: Between(new Date(new Date(`${first}T00:00:00Z`).getTime() - 86400000), new Date(end.getTime() + 2 * 86400000)) }, order: { startedAt: 'ASC' } }),
      this.db.getRepository(User).findOneBy({ id: userId }),
    ]);
    const days = dates.map(date => ({ date, training: [] as Record<string, unknown>[], meals: [] as Record<string, unknown>[] }));
    const byDate = new Map(days.map(day => [day.date, day]));
    for (const meal of meals) {
      const day = byDate.get(meal.date);
      if (!day) continue;
      day.meals.push({ time: meal.snapshot.time, moment: meal.snapshot.moment,
        foods: meal.snapshot.items.map(item => ({ name: item.food.name, amount: item.amount, unit: item.food.baseUnit,
          nutrientsPer100: item.food.per100 })), totals: meal.snapshot.totals ?? null });
    }
    for (const workout of workouts) {
      const snapshot = workout.snapshot;
      const day = byDate.get(dateKey(workout.startedAt, snapshot.timezone));
      if (!day) continue;
      day.training.push({ status: snapshot.status, sport: snapshot.workout.sport ?? snapshot.workout.kind,
        startedAt: workout.startedAt.toISOString(), durationMinutes: snapshot.endedAt ? Math.round((snapshot.endedAt - snapshot.startedAt) / 60000) : null,
        exercises: snapshot.exercises.map(exercise => ({ name: exercise.name, sets: exercise.sets.filter(set => set && !set.warmup).map(set => ({ weightKg: set!.weight, repetitions: set!.reps, feeling: set!.feeling })) })),
        sportMetrics: snapshot.sportMetrics, debrief: snapshot.status === 'completed' ? snapshot.debrief : null });
    }
    return anonymousData(days, user?.firstName);
  }

  async coachMemory(userId: string, offset = 0, limit = 30) {
    const safeOffset = Math.max(0, Math.min(10000, Math.floor(offset)));
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
    const rows = await this.db.query(`
      SELECT source, role, text, occurred_at AS "occurredAt" FROM (
        SELECT 'nutrition_opinion' AS source, 'assistant' AS role, text, created_at AS occurred_at
        FROM nutrition_coach_opinions WHERE user_id=$1
        UNION ALL
        SELECT c.purpose AS source, m.role, m.text, m.created_at AS occurred_at
        FROM chat_messages m JOIN chat_conversations c ON c.id=m.conversation_id
        WHERE c.user_id=$1 AND c.purpose='program_review' AND m.role='assistant'
      ) history ORDER BY occurred_at DESC, source DESC LIMIT $2 OFFSET $3`, [userId, safeLimit + 1, safeOffset]) as { source: string; role: string; text: string; occurredAt: Date }[];
    const [user, onboarding] = await Promise.all([
      this.db.getRepository(User).findOneBy({ id: userId }), this.db.getRepository(Onboarding).findOneBy({ userId }),
    ]);
    const allergy = typeof onboarding?.profile?.allergies === 'string' ? onboarding.profile.allergies : '';
    const terms = allergy.split(/[,;\/]/).map(term => term.trim()).filter(term => term.length >= 3);
    const messages = rows.slice(0, safeLimit).map(row => ({ ...row, occurredAt: new Date(row.occurredAt).toISOString(),
      text: terms.reduce((value, term) => value.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'giu'), '[allergie]'), row.text) }));
    return anonymousData({ messages, nextOffset: rows.length > safeLimit ? safeOffset + safeLimit : null }, user?.firstName);
  }
}
