import type { EntityManager } from 'typeorm';
import type { WorkoutSnapshot } from '../workouts/workout.schema';
import { dateInTimezone, weekOf } from './game.rules';

export const badgeTargets = { first_checkin: 1, first_workout: 1, month: 30, hundred: 100, pullups: 10, boxer: 20, sleep: 30, protein: 50 } as const;
export type BadgeId = keyof typeof badgeTargets;
type CompletedWorkout = { id: string; snapshot: Partial<WorkoutSnapshot>; started_at: Date };

export function workoutBadgeCounts(rows: CompletedWorkout[]) {
  const sessions = new Set<string>(), boxing = new Set<string>();
  let pullups = 0;
  for (const row of rows) {
    const { workout, exercises = [] } = row.snapshot;
    if (!workout) continue;
    const date = dateInTimezone(new Date(row.started_at), row.snapshot.timezone ?? 'UTC');
    const key = workout.programVersionId && Number.isInteger(workout.sessionIndex)
      ? `${workout.programVersionId}:${workout.week ?? weekOf(date)}:${workout.sessionIndex}` : row.id;
    sessions.add(key);
    if (/^(boxing|boxe|boxe anglaise|boxe francaise|kickboxing|muay thai)$/i.test(normalize(workout.sport ?? workout.name ?? ''))) boxing.add(key);
    for (const exercise of exercises) {
      const name = normalize(exercise.name);
      if (!/\b(tractions?|pull[ -]?ups?|chin[ -]?ups?)\b/.test(name)
        || /assist|elastique|band|negati|australi|horizontal|machine/.test(name + ' ' + normalize(exercise.equipment ?? ''))) continue;
      for (const set of exercise.sets ?? []) if (set && !set.warmup && Number.isFinite(set.reps)) pullups = Math.max(pullups, set.reps);
    }
  }
  return { workouts: sessions.size, boxing: boxing.size, pullups };
}
function normalize(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

/** Called under the account lock used by GameService; unlocks survive corrections. */
export async function projectBadges(manager: EntityManager, userId: string, timezone: string, today: string) {
  const daily = await manager.query(`SELECT data FROM daily_check_ins
    WHERE user_id=$1 AND completed_at IS NOT NULL AND date<=$2::date`, [userId, today]) as { data: { sleepMinutes?: number } | null }[];
  const workouts = await manager.query(`SELECT id,snapshot,started_at FROM workout_sessions
    WHERE user_id=$1 AND status='completed' AND ended_at<=now()`, [userId]) as CompletedWorkout[];
  const counts = workoutBadgeCounts(workouts);
  // Use the target belonging to the accepted program for that day, never today's target for past meals.
  const [protein] = await manager.query(`SELECT count(*)::int AS n FROM (
    SELECT date,sum(COALESCE((snapshot->'totals'->>'protein')::numeric,0)) AS protein
    FROM nutrition_meals WHERE user_id=$1 AND deleted_at IS NULL AND date<=$2::date GROUP BY date
  ) meals JOIN LATERAL (
    SELECT (n.targets->>'protein')::numeric AS target FROM program_blocks b
    JOIN nutrition_plans n ON n.program_run_id=b.id AND n.user_id=b.user_id
    WHERE b.user_id=$1 AND n.status='ready'
      AND (b.started_at AT TIME ZONE $3)::date<=meals.date
      AND (b.ends_at AT TIME ZONE $3)::date>meals.date
    ORDER BY b.started_at DESC LIMIT 1
  ) plan ON plan.target>0 AND meals.protein>=plan.target`, [userId, today, timezone]);
  const values: Record<BadgeId, number> = {
    first_checkin: daily.length, first_workout: counts.workouts,
    month: daily.length, hundred: counts.workouts, pullups: counts.pullups, boxer: counts.boxing,
    sleep: daily.filter(row => typeof row.data?.sleepMinutes === 'number' && row.data.sleepMinutes >= 360).length,
    protein: Number(protein.n),
  };
  for (const id of Object.keys(badgeTargets) as BadgeId[]) {
    if (values[id] >= badgeTargets[id]) await manager.query(
      'INSERT INTO game_badges(user_id,badge_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [userId, id]);
  }
  const unlocked = await manager.query('SELECT badge_id,unlocked_at,celebrated_at FROM game_badges WHERE user_id=$1', [userId]) as {
    badge_id: BadgeId; unlocked_at: Date; celebrated_at: Date | null;
  }[];
  return (Object.keys(badgeTargets) as BadgeId[]).map(id => {
    const row = unlocked.find(item => item.badge_id === id), target = badgeTargets[id];
    return { id, target, current: row ? target : Math.min(target, values[id]),
      unlockedAt: row ? new Date(row.unlocked_at).toISOString() : null,
      celebratedAt: row?.celebrated_at ? new Date(row.celebrated_at).toISOString() : null };
  });
}
