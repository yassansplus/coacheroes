import type { EntityManager } from 'typeorm';

export type GameEquipment = { frame: string; title: string; theme: string };
export const defaultEquipment: GameEquipment = { frame: 'none', title: 'none', theme: 'light' };

export function longestCheckinStreak(dates: string[]) {
  let best = 0, streak = 0, previous = 0;
  for (const date of [...new Set(dates)].sort()) {
    const day = Date.parse(`${date}T12:00:00Z`);
    if (!Number.isFinite(day)) continue;
    streak = day - previous === 86400000 ? streak + 1 : 1;
    best = Math.max(best, streak);
    previous = day;
  }
  return best;
}

export async function gameRewards(manager: EntityManager, userId: string, level: number, total: number, today: string) {
  const rows = await manager.query(`SELECT date::text AS date FROM daily_check_ins
    WHERE user_id=$1 AND completed_at IS NOT NULL AND date<=$2::date`, [userId, today]) as { date: string }[];
  const bestStreak = longestCheckinStreak(rows.map(row => row.date));
  const unlockedRewards = [
    ...(level >= 5 ? ['azur'] : []), ...(level >= 9 ? ['cobalt'] : []),
    ...(level >= 8 ? ['confirmed'] : []), ...(bestStreak >= 14 ? ['regular'] : []),
    'light', ...(total >= 5000 ? ['violet'] : []),
  ];
  const [saved] = await manager.query('SELECT frame,title,theme FROM game_equipment WHERE user_id=$1', [userId]) as GameEquipment[];
  const equipment = { ...defaultEquipment };
  if (saved) for (const category of ['frame', 'title', 'theme'] as const) {
    if (unlockedRewards.includes(saved[category])) equipment[category] = saved[category];
  }
  return { unlockedRewards, equipment };
}
