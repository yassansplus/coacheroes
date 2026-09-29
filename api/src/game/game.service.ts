import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { challengeCounts } from '../squad/squad-stats';
import { dateInTimezone, levelProgress, weekOf, xpRules } from './game.rules';
import { projectBadges, type BadgeId } from './game.badges';
import { JournalEntry } from '../database/entities';
import { gameRewards, type GameEquipment } from './game.rewards';

type JournalRow = { id: string; type: string; payload: Record<string, any>; occurred_at: Date };
type XpRow = { id: string; rule: string; source_key: string; category: string; title: string; xp: number; occurred_at: Date };
type Award = { rule: string; sourceKey: string; xp: number; category: string; title: string; at: Date; date?: string; micro?: boolean };
const journalTypes = [
  'onboarding.completed', 'program.accepted', 'program.renewal_requested', 'workout.started', 'workout.completed', 'daily.completed',
  'nutrition.meal.created', 'squad.group.created', 'squad.invitation.accepted',
  'coach.proposal.applied', 'coach.proposal.declined', 'progression.weight.saved', 'progression.measurements.saved',
  'progression.boxing_test.saved', 'progression.photos.saved', 'profile.avatar.uploaded',
];
const dayMs = 86400000;

@Injectable()
export class GameService {
  constructor(private readonly db: DataSource) {}

  private async award(manager: EntityManager, userId: string, value: Award, timezone: string) {
    const date = value.date ?? dateInTimezone(value.at, timezone);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const week = weekOf(date);
    let xp: number = value.xp;
    if (value.micro) {
      const [used] = await manager.query(`SELECT COALESCE(sum(xp),0)::int AS xp FROM game_xp_events
        WHERE user_id=$1 AND category='micro' AND week_key=$2`, [userId, week]);
      xp = Math.min(xp, Math.max(0, 50 - Number(used.xp)));
    }
    if (!xp) return;
    await manager.query(`INSERT INTO game_xp_events(user_id,rule,source_key,category,title,xp,week_key,occurred_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,rule,source_key) DO NOTHING`,
    [userId, value.rule, value.sourceKey, value.category, value.title, xp, week, value.at]);
  }

  private async processJournal(manager: EntityManager, userId: string, row: JournalRow, timezone: string) {
    const p = row.payload ?? {}, at = new Date(row.occurred_at);
    const give = (value: Omit<Award, 'at'>) => this.award(manager, userId, { ...value, at }, timezone);
    switch (row.type) {
      case 'onboarding.completed':
        await give({ rule: 'onboarding', sourceKey: 'first', xp: xpRules.onboarding, category: 'profile', title: 'Onboarding terminé' }); break;
      case 'program.accepted':
        if (p.runId) await give({ rule: 'program.accepted', sourceKey: String(p.runId), xp: xpRules.programAccepted,
          category: 'program', title: 'Programme validé' }); break;
      case 'program.renewal_requested':
        if (p.sourceBlockId) await give({ rule: 'program.review', sourceKey: String(p.sourceBlockId), xp: xpRules.programReview,
          category: 'program', title: 'Bilan du programme terminé' }); break;
      case 'workout.started': case 'workout.completed': {
        const snapshot = p.after?.snapshot;
        const workout = snapshot?.workout;
        if (!p.sessionId || !workout || p.after?.snapshot?.status !== 'completed') break;
        const planned = Boolean(workout.programVersionId && Number.isInteger(workout.sessionIndex));
        const completedAt = new Date(snapshot.endedAt ?? snapshot.startedAt);
        if (Number.isNaN(completedAt.getTime())) break;
        const date = dateInTimezone(completedAt, snapshot.timezone ?? timezone);
        if (planned) {
          const key = `${workout.programVersionId}:${workout.week ?? weekOf(date)}:${workout.sessionIndex}`;
          await this.award(manager, userId, { rule: 'workout.planned', sourceKey: key, xp: xpRules.plannedWorkout, category: 'training',
            title: 'Séance prévue terminée', date, at: completedAt }, timezone);
        } else {
          const week = weekOf(date);
          const [count] = await manager.query(`SELECT count(*)::int AS n FROM game_xp_events
            WHERE user_id=$1 AND rule='workout.free' AND week_key=$2`, [userId, week]);
          if (Number(count.n) < 2) await this.award(manager, userId, { rule: 'workout.free', sourceKey: String(p.sessionId), xp: xpRules.freeWorkout,
            category: 'training', title: 'Séance libre terminée', date, at: completedAt }, timezone);
        }
        break;
      }
      case 'daily.completed':
        if (p.date) await give({ rule: 'daily', sourceKey: String(p.date), xp: xpRules.daily, category: 'daily', title: 'Bilan quotidien terminé', date: String(p.date) });
        break;
      case 'nutrition.meal.created': {
        const date = String(p.after?.date ?? '');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) break;
        const [count] = await manager.query(`SELECT count(*)::int AS n FROM game_xp_events
          WHERE user_id=$1 AND rule='meal' AND source_key LIKE $2`, [userId, `${date}:%`]);
        const slot = Number(count.n) + 1;
        if (slot <= 2) await give({ rule: 'meal', sourceKey: `${date}:${slot}`, xp: xpRules.meal,
          category: 'nutrition', title: 'Repas enregistré', date });
        break;
      }
      case 'squad.group.created':
        await give({ rule: 'group.created', sourceKey: 'first', xp: xpRules.group, category: 'micro', title: 'Premier groupe créé', micro: true }); break;
      case 'squad.invitation.accepted': {
        if (p.kind === 'friend' && p.inviterId) {
          const pair = [userId, String(p.inviterId)].sort().join(':');
          await give({ rule: 'friendship', sourceKey: pair, xp: xpRules.friendship, category: 'micro', title: 'Nouvel ami', micro: true });
        } else if (p.kind === 'group' && p.groupId) {
          await give({ rule: 'group.joined', sourceKey: String(p.groupId), xp: xpRules.group, category: 'micro', title: 'Groupe rejoint', micro: true });
        }
        break;
      }
      case 'coach.proposal.applied': case 'coach.proposal.declined':
        if (p.proposalId) await give({ rule: 'coach.decision', sourceKey: String(p.proposalId), xp: xpRules.coachDecision,
          category: 'micro', title: 'Proposition du coach examinée', micro: true }); break;
      case 'progression.weight.saved': case 'progression.measurements.saved': case 'progression.boxing_test.saved': {
        const date = String(p.date ?? dateInTimezone(at, timezone));
        await give({ rule: 'progression.month', sourceKey: date.slice(0, 7), xp: xpRules.progression,
          category: 'micro', title: 'Progression renseignée', date, micro: true }); break;
      }
      case 'progression.photos.saved':
        await give({ rule: 'photo.first', sourceKey: 'first', xp: xpRules.photo,
          category: 'micro', title: 'Première photo ajoutée', micro: true }); break;
      case 'profile.avatar.uploaded':
        await give({ rule: 'photo.first', sourceKey: 'first', xp: xpRules.avatar,
          category: 'micro', title: 'Première photo ajoutée', micro: true }); break;
    }
  }

  private async projectJournal(manager: EntityManager, userId: string, timezone: string) {
    for (;;) {
      const rows = await manager.query(`SELECT j.id,j.type,j.payload,j.occurred_at FROM journal_entries j
        WHERE j.user_id=$1 AND j.type=ANY($2::text[]) AND NOT EXISTS
          (SELECT 1 FROM game_processed_journal p WHERE p.journal_id=j.id)
        ORDER BY j.recorded_at,j.id LIMIT 200`, [userId, journalTypes]) as JournalRow[];
      if (!rows.length) break;
      for (const row of rows) {
        await this.processJournal(manager, userId, row, timezone);
        await manager.query('INSERT INTO game_processed_journal(journal_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [row.id, userId]);
      }
      if (rows.length < 200) break;
    }
  }

  private async projectSocial(manager: EntityManager, userId: string, timezone: string) {
    const invitations = await manager.query(`SELECT inviter_id,invitee_id,resolved_at FROM squad_invitations
      WHERE inviter_id=$1 AND kind='friend' AND status='accepted'`, [userId]);
    for (const invite of invitations) {
      const pair = [userId, String(invite.invitee_id)].sort().join(':');
      await this.award(manager, userId, { rule: 'friendship', sourceKey: pair, xp: xpRules.friendship,
        category: 'micro', title: 'Nouvel ami', at: new Date(invite.resolved_at), micro: true }, timezone);
    }
    const participations = await manager.query(`SELECT c.*,p.joined_at,p.left_at FROM squad_challenges c
      JOIN squad_challenge_participants p ON p.challenge_id=c.id WHERE p.user_id=$1`, [userId]);
    for (const challenge of participations) {
      await this.award(manager, userId, { rule: 'challenge.joined', sourceKey: String(challenge.id), xp: xpRules.challengeJoin,
        category: 'micro', title: 'Challenge collectif rejoint', at: new Date(challenge.joined_at), micro: true }, timezone);
      if (new Date(challenge.ends_at) > new Date()) continue;
      const result = await challengeCounts(manager, challenge);
      if (result.currentSessions < result.targetSessions || !result.contributions.some(item => item.userId === userId && item.count > 0)) continue;
      await this.award(manager, userId, { rule: 'challenge.completed', sourceKey: String(challenge.id), xp: xpRules.challengeComplete,
        category: 'micro', title: 'Challenge collectif réussi', at: new Date(challenge.ends_at), micro: true }, timezone);
    }
  }

  private async projectWeekly(manager: EntityManager, userId: string, timezone: string, today: string) {
    const currentWeek = weekOf(today);
    const daily = await manager.query(`SELECT date::text AS date FROM daily_check_ins
      WHERE user_id=$1 AND completed_at IS NOT NULL`, [userId]) as { date: string }[];
    const dailyCounts = new Map<string, number>();
    for (const row of daily) dailyCounts.set(weekOf(row.date), (dailyCounts.get(weekOf(row.date)) ?? 0) + 1);
    for (const [week, count] of dailyCounts) if (count >= 4) await this.award(manager, userId,
      { rule: 'weekly.checkins', sourceKey: week, xp: xpRules.weeklyCheckins, category: 'mission', title: 'Quatre bilans cette semaine',
        at: new Date(`${week}T12:00:00Z`), date: week }, timezone);

    const blocks = await manager.query('SELECT id,started_at,ends_at,prescription FROM program_blocks WHERE user_id=$1 ORDER BY started_at', [userId]);
    const workouts = await manager.query(`SELECT program_version_id,started_at,snapshot FROM workout_sessions
      WHERE user_id=$1 AND status='completed' AND program_version_id IS NOT NULL`, [userId]);
    let current = { completed: 0, target: 0, awarded: false };
    for (const block of blocks) {
      const templates = block.prescription?.output?.result?.sessions ?? [];
      if (!templates.length) continue;
      const start = dateInTimezone(new Date(block.started_at), timezone);
      const end = dateInTimezone(new Date(block.ends_at), timezone);
      const last = weekOf(end < today ? end : today);
      const relevant = workouts.filter((workout: any) => workout.program_version_id === block.id);
      for (let week = weekOf(start); week <= last;) {
        const monday = new Date(`${week}T12:00:00Z`);
        const scheduled = templates.map((template: any, index: number) => {
          const date = new Date(monday.getTime() + Number(template.weekday) * dayMs).toISOString().slice(0, 10);
          return date >= start && date < end ? index : -1;
        }).filter((index: number) => index >= 0);
        const completed = new Set<number>();
        for (const workout of relevant) {
          const date = dateInTimezone(new Date(workout.started_at), workout.snapshot?.timezone ?? timezone);
          const index = workout.snapshot?.workout?.sessionIndex;
          if (weekOf(date) === week && scheduled.includes(index)) completed.add(index);
        }
        if (scheduled.length && completed.size >= Math.ceil(scheduled.length * 0.8)) await this.award(manager, userId,
          { rule: 'weekly.plan', sourceKey: `${block.id}:${week}`, xp: xpRules.weeklyPlan, category: 'mission',
            title: 'Programme de la semaine suivi', at: new Date(`${week}T12:00:00Z`), date: week }, timezone);
        if (week === currentWeek && start <= today && end > today) current = {
          completed: completed.size, target: scheduled.length, awarded: completed.size >= Math.ceil(scheduled.length * 0.8) && scheduled.length > 0,
        };
        monday.setUTCDate(monday.getUTCDate() + 7);
        week = monday.toISOString().slice(0, 10);
      }
    }
    return { plan: current, checkins: { completed: dailyCounts.get(currentWeek) ?? 0, target: 4 } };
  }

  async get(userId: string, after: number | null) {
    return this.db.transaction(async manager => {
      await manager.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const [preference] = await manager.query('SELECT timezone FROM daily_preferences WHERE user_id=$1', [userId]);
      const timezone = typeof preference?.timezone === 'string' ? preference.timezone : 'UTC';
      const today = dateInTimezone(new Date(), timezone), week = weekOf(today);
      await this.projectJournal(manager, userId, timezone);
      await this.projectSocial(manager, userId, timezone);
      const weekly = await this.projectWeekly(manager, userId, timezone, today);
      const badges = await projectBadges(manager, userId, timezone, today);
      const [summary] = await manager.query(`SELECT COALESCE(sum(xp),0)::int AS total,
        COALESCE(sum(xp) FILTER(WHERE week_key=$2),0)::int AS weekly,
        COALESCE(max(id),0)::bigint AS latest FROM game_xp_events WHERE user_id=$1`, [userId, week]);
      const categories = await manager.query(`SELECT category,COALESCE(sum(xp),0)::int AS xp FROM game_xp_events
        WHERE user_id=$1 AND week_key=$2 GROUP BY category`, [userId, week]) as { category: string; xp: number }[];
      const recent = await manager.query(`SELECT id::text,rule,source_key,category,title,xp,occurred_at FROM game_xp_events
        WHERE user_id=$1 ORDER BY id DESC LIMIT 50`, [userId]) as XpRow[];
      const events = after === null ? [] : await manager.query(`SELECT id::text,rule,source_key,category,title,xp,occurred_at FROM game_xp_events
        WHERE user_id=$1 AND id>$2 ORDER BY id ASC LIMIT 30`, [userId, after]) as XpRow[];
      const [daily] = await manager.query(`SELECT completed_at FROM daily_check_ins WHERE user_id=$1 AND date=$2`, [userId, today]);
      const [meals] = await manager.query(`SELECT count(*)::int AS n FROM game_xp_events
        WHERE user_id=$1 AND rule='meal' AND source_key LIKE $2`, [userId, `${today}:%`]);
      const [workout] = await manager.query(`SELECT count(*)::int AS n FROM workout_sessions WHERE user_id=$1 AND status='completed'
        AND program_version_id IS NOT NULL AND (ended_at AT TIME ZONE $3)::date=$2::date`, [userId, today, timezone]);
      const total = Number(summary.total);
      const rewards = await gameRewards(manager, userId, levelProgress(total).level, total, today);
      return { ...levelProgress(total), total, weekly: Number(summary.weekly), latestEventId: Number(summary.latest),
        nextEventId: events.length ? Number(events.at(-1)!.id) : Number(summary.latest),
        events: events.map(this.viewEvent), recent: recent.map(this.viewEvent), badges, ...rewards,
        breakdown: Object.fromEntries(categories.map(row => [row.category, Number(row.xp)])),
        missions: { daily: { checkin: Boolean(daily?.completed_at), meals: Math.min(2, Number(meals.n)), workout: Number(workout.n) > 0 },
          weekly } };
    });
  }

  private viewEvent(row: XpRow) {
    return { id: Number(row.id), rule: row.rule, sourceKey: row.source_key, category: row.category, title: row.title,
      xp: Number(row.xp), occurredAt: new Date(row.occurred_at).toISOString() };
  }

  async equip(userId: string, equipment: GameEquipment) {
    // Project pending XP before checking rewards. Unlock criteria are cumulative.
    const progress = await this.get(userId, null);
    const choices = { frame: ['none', 'azur', 'cobalt'], title: ['none', 'confirmed', 'regular'], theme: ['light', 'violet'] };
    for (const category of ['frame', 'title', 'theme'] as const) {
      const id = equipment[category];
      if (!choices[category].includes(id) || (id !== 'none' && !progress.unlockedRewards.includes(id))) {
        throw new BadRequestException('Cet élément n’est pas encore débloqué.');
      }
    }
    await this.db.transaction(async manager => {
      await manager.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const [before] = await manager.query('SELECT frame,title,theme FROM game_equipment WHERE user_id=$1', [userId]);
      if (before && (['frame', 'title', 'theme'] as const).every(key => before[key] === equipment[key])) return;
      await manager.query(`INSERT INTO game_equipment(user_id,frame,title,theme) VALUES($1,$2,$3,$4)
        ON CONFLICT(user_id) DO UPDATE SET frame=EXCLUDED.frame,title=EXCLUDED.title,theme=EXCLUDED.theme,updated_at=now()`,
      [userId, equipment.frame, equipment.title, equipment.theme]);
      await manager.getRepository(JournalEntry).save({ userId, requestId: randomUUID(), type: 'game.equipment.saved',
        occurredAt: new Date(), payload: { before: before ?? null, after: equipment } });
    });
    return { equipment };
  }

  async celebrateBadges(userId: string, ids: BadgeId[]) {
    await this.db.query(`UPDATE game_badges SET celebrated_at=COALESCE(celebrated_at,now())
      WHERE user_id=$1 AND badge_id=ANY($2::text[]) AND celebrated_at IS NULL`, [userId, ids]);
    return { ok: true };
  }
}
