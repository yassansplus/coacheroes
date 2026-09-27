import type { EntityManager } from 'typeorm';

/** One effective weigh-in per local date; the last explicit entry wins. */
export async function weightTimeline(manager: EntityManager, userId: string): Promise<{ date: string; value: number }[]> {
  const rows = await manager.query(`WITH candidates AS (
    SELECT date, (data->>'weightKg')::double precision AS value, updated_at, 0 AS priority
      FROM daily_check_ins WHERE user_id=$1 AND completed_at IS NOT NULL AND data->>'weightKg' IS NOT NULL
    UNION ALL
    SELECT date, value_kg AS value, updated_at, 1 AS priority
      FROM progression_weights WHERE user_id=$1
  ), ranked AS (
    SELECT date, value, row_number() OVER (PARTITION BY date ORDER BY updated_at DESC, priority DESC) AS rank
      FROM candidates
  ) SELECT date::text AS date, value FROM ranked WHERE rank=1 ORDER BY date ASC`, [userId]);
  return rows.map((row: { date: string; value: number }) => ({ date: row.date, value: Number(row.value) }));
}
