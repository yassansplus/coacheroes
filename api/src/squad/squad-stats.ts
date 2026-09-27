import type { EntityManager } from 'typeorm';

type WorkoutRow = { id: string; user_id: string; started_at: Date; ended_at: Date | null; summary: any; snapshot: any };
type BlockRow = { user_id: string; started_at: Date; ends_at: Date; extensions: number; prescription: any };
export type SharedStats = {
  sessionsWeek: number; sessions28: number; attendance: number | null; streak: number;
  weekly: { date: string; count: number }[]; sports: { sport: string; count: number }[];
  records: { id: string; title: string; value: string }[];
};
export type SessionEvent = { id: string; userId: string; at: string; sport: string; minutes: number };
const dayMs = 86400000;
const dateKey = (date: Date, timezone = 'UTC') => {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
  catch { return date.toISOString().slice(0, 10); }
};
const monday = (date: Date) => {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day;
};
const sportName = (snapshot: any) => String(snapshot?.workout?.sport ?? (snapshot?.workout?.kind === 'free' ? 'autre' : 'strength'));

export async function squadStats(manager: EntityManager, userIds: string[], now = new Date(), joinedAt?: Map<string, Date>) {
  const ids = [...new Set(userIds)];
  const startWeek = monday(now), firstWeek = new Date(startWeek.getTime() - 11 * 7 * dayMs);
  const today = dateKey(now), cutoff28 = dateKey(new Date(now.getTime() - 27 * dayMs));
  const weekDates = Array.from({ length: 12 }, (_, index) => dateKey(new Date(firstWeek.getTime() + index * 7 * dayMs)));
  const empty = (): SharedStats => ({ sessionsWeek: 0, sessions28: 0, attendance: null, streak: 0,
    weekly: weekDates.map(date => ({ date, count: 0 })), sports: [], records: [] });
  const stats = new Map(ids.map(id => [id, empty()]));
  if (!ids.length) return { stats, events: [] as SessionEvent[] };
  const [workouts, blocks] = await Promise.all([
    manager.query(`SELECT id,user_id,started_at,ended_at,summary,snapshot FROM workout_sessions
      WHERE user_id=ANY($1::uuid[]) AND status='completed' AND started_at >= $2 ORDER BY started_at ASC`, [ids, firstWeek]),
    manager.query(`SELECT user_id,started_at,ends_at,extensions,prescription FROM program_blocks WHERE user_id=ANY($1::uuid[])`, [ids]),
  ]) as [WorkoutRow[], BlockRow[]];
  const byUser = new Map<string, WorkoutRow[]>();
  const events: SessionEvent[] = [];
  for (const row of workouts) {
    if (joinedAt?.get(row.user_id) && new Date(row.started_at) < joinedAt.get(row.user_id)!) continue;
    const list = byUser.get(row.user_id) ?? []; list.push(row); byUser.set(row.user_id, list);
    const item = stats.get(row.user_id)!;
    const date = dateKey(new Date(row.started_at), row.snapshot?.timezone || 'UTC');
    const week = monday(new Date(`${date}T12:00:00Z`)).toISOString().slice(0, 10);
    const index = weekDates.indexOf(week);
    if (index >= 0) item.weekly[index].count++;
    if (date >= weekDates[11] && date <= today) item.sessionsWeek++;
    if (date >= cutoff28 && date <= today) {
      item.sessions28++;
      const sport = sportName(row.snapshot);
      const current = item.sports.find(value => value.sport === sport);
      if (current) current.count++; else item.sports.push({ sport, count: 1 });
    }
    const minutes = Math.round(Number(row.summary?.durationSeconds ?? 0) / 60);
    if (date >= dateKey(new Date(now.getTime() - 7 * dayMs)))
      events.push({ id: row.id, userId: row.user_id, at: new Date(row.ended_at ?? row.started_at).toISOString(), sport: sportName(row.snapshot), minutes });
  }
  const planned = new Map(ids.map(id => [id, 0]));
  for (const block of blocks) {
    const templates = block.prescription?.output?.result?.sessions ?? [];
    const weeks = Number(block.prescription?.output?.result?.blockWeeks ?? 4) + Number(block.extensions ?? 0);
    for (let week = 1; week <= weeks; week++) for (const template of templates) {
      if (!Number.isInteger(template.weekday) || template.weekday < 0 || template.weekday > 6) continue;
      const date = new Date(block.started_at);
      const offset = (date.getUTCDay() + 6) % 7;
      date.setUTCDate(date.getUTCDate() + (template.weekday - offset + 7) % 7 + (week - 1) * 7);
      const key = dateKey(date);
      if (key >= cutoff28 && key < today && date < new Date(block.ends_at) && (!joinedAt?.get(block.user_id) || date >= joinedAt.get(block.user_id)!))
        planned.set(block.user_id, (planned.get(block.user_id) ?? 0) + 1);
    }
  }
  for (const id of ids) {
    const item = stats.get(id)!, sessions = byUser.get(id) ?? [];
    const target = planned.get(id) ?? 0;
    item.attendance = target ? Math.min(100, Math.round(item.sessions28 / target * 100)) : null;
    const activeDays = new Set(sessions.map(row => dateKey(new Date(row.started_at), row.snapshot?.timezone || 'UTC')));
    const cursor = new Date(`${today}T12:00:00Z`);
    if (!activeDays.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
    while (activeDays.has(dateKey(cursor))) { item.streak++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
    const records = new Map<string, { id: string; title: string; value: string; score: number }>();
    for (const row of sessions) for (const exercise of row.snapshot?.exercises ?? []) {
      const sets = (exercise.sets ?? []).filter((set: any) => set && !set.warmup && Number.isFinite(set.reps) && Number.isFinite(set.weight));
      for (const set of sets) {
        const score = set.weight > 0 ? set.weight * 1000 + set.reps : set.reps;
        const current = records.get(exercise.id);
        if (!current || score > current.score) records.set(exercise.id, { id: exercise.id, title: exercise.name,
          value: set.weight > 0 ? `${set.weight} kg × ${set.reps}` : `${set.reps} répétitions`, score });
      }
    }
    item.records = [...records.values()].sort((a, b) => b.score - a.score).slice(0, 3).map(({ score: _score, ...record }) => record);
  }
  events.sort((a, b) => b.at.localeCompare(a.at));
  return { stats, events };
}

export async function challengeCounts(manager: EntityManager, challenge: any) {
  const participants = await manager.query(`SELECT p.user_id,p.joined_at,p.left_at FROM squad_challenge_participants p WHERE p.challenge_id=$1`, [challenge.id]) as { user_id: string; joined_at: Date; left_at: Date | null }[];
  const ids = participants.map(row => row.user_id);
  const byId = new Map(participants.map(row => [row.user_id, row]));
  const counts = new Map(ids.map(id => [id, 0]));
  if (ids.length) {
    const rows = await manager.query(`SELECT user_id,started_at,summary,snapshot FROM workout_sessions WHERE user_id=ANY($1::uuid[])
      AND status='completed' AND started_at >= $2 AND started_at < $3 ORDER BY started_at ASC`,
    [ids, challenge.starts_at, challenge.ends_at]) as WorkoutRow[];
    const seen = new Set<string>();
    for (const row of rows) {
      const participant = byId.get(row.user_id)!;
      if (new Date(row.started_at) < new Date(participant.joined_at) || participant.left_at && new Date(row.started_at) >= new Date(participant.left_at)) continue;
      if (Number(row.summary?.durationSeconds ?? 0) < challenge.min_minutes * 60) continue;
      const date = dateKey(new Date(row.started_at), row.snapshot?.timezone || 'UTC');
      const key = `${row.user_id}:${date}`;
      if (seen.has(key)) continue;
      seen.add(key); counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    }
  }
  const currentSessions = [...counts.values()].reduce((sum, value) => sum + value, 0);
  return { id: challenge.id, groupId: challenge.group_id, title: challenge.title, targetSessions: challenge.target_sessions,
    currentSessions, minMinutes: challenge.min_minutes, startsAt: new Date(challenge.starts_at).toISOString(),
    endsAt: new Date(challenge.ends_at).toISOString(), contributions: [...counts].map(([userId, count]) => ({ userId, count })) };
}
