import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import type { z } from 'zod';
import { JournalEntry } from '../database/entities';
import { challengeCounts, squadStats, type SharedStats } from './squad-stats';
import { actionSchema, challengeSchema, createGroupSchema, inviteSchema, preferenceSchema, renameGroupSchema, transferSchema } from './squad.schema';

type GroupRow = { id: string; name: string; owner_id: string; revision: number; member_count?: number };
type InvitationRow = { id: string; kind: 'friend' | 'group'; inviter_id: string; invitee_id: string | null; group_id: string | null;
  status: string; expires_at: Date; token_hash: string; created_at: Date };
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const pair = (a: string, b: string) => a < b ? [a, b] : [b, a];
const summary = (stats: SharedStats | undefined, detailed: boolean, shareRecords: boolean) => {
  const base = stats ?? { sessionsWeek: 0, sessions28: 0, attendance: null, streak: 0, weekly: [], sports: [], records: [] };
  return { sessionsWeek: base.sessionsWeek, sessions28: detailed ? base.sessions28 : null, weekly: base.weekly,
    attendance: detailed ? base.attendance : null, streak: detailed ? base.streak : null,
    sports: detailed ? base.sports : [], records: detailed && shareRecords ? base.records : [] };
};

@Injectable()
export class SquadService {
  constructor(private readonly db: DataSource) {}

  private async journal(manager: EntityManager, userId: string, requestId: string, type: string, payload: Record<string, unknown>) {
    await manager.save(JournalEntry, manager.create(JournalEntry, { userId, requestId, type, occurredAt: new Date(), payload }));
  }
  private async receipt(manager: EntityManager, userId: string, requestId: string, type: string) {
    const row = await manager.findOneBy(JournalEntry, { userId, requestId });
    if (row && row.type !== type) throw new ConflictException('Cet identifiant de sauvegarde est déjà utilisé.');
    return row;
  }
  private async activeMember(manager: EntityManager, userId: string, groupId: string) {
    const [row] = await manager.query(`SELECT g.id,g.name,g.owner_id,g.revision,m.role FROM squad_groups g
      JOIN squad_memberships m ON m.group_id=g.id AND m.user_id=$2 AND m.left_at IS NULL WHERE g.id=$1`, [groupId, userId]);
    if (!row) throw new NotFoundException('Groupe introuvable.');
    return row as GroupRow & { role: string };
  }
  private async preferenceRows(manager: EntityManager, ids: string[]) {
    if (!ids.length) return new Map<string, { share_activity: boolean; share_records: boolean; revision: number }>();
    const rows = await manager.query(`SELECT user_id,share_activity,share_records,revision FROM squad_preferences WHERE user_id=ANY($1::uuid[])`, [ids]);
    return new Map((rows as any[]).map(row => [row.user_id as string, row as { share_activity: boolean; share_records: boolean; revision: number }]));
  }
  async overview(userId: string) {
    const manager = this.db.manager;
    const [people, friends, groups, inbox, preferences] = await Promise.all([
      manager.query('SELECT id,first_name FROM users WHERE id=$1', [userId]),
      manager.query(`SELECT u.id,u.first_name FROM squad_friendships f JOIN users u
        ON u.id=CASE WHEN f.user_a=$1 THEN f.user_b ELSE f.user_a END
        WHERE f.active=true AND (f.user_a=$1 OR f.user_b=$1) ORDER BY u.first_name NULLS LAST,u.id`, [userId]),
      manager.query(`SELECT g.id,g.name,g.owner_id,g.revision,g.created_at,
        (SELECT count(*)::int FROM squad_memberships mm WHERE mm.group_id=g.id AND mm.left_at IS NULL) AS member_count
        FROM squad_groups g JOIN squad_memberships m ON m.group_id=g.id
        WHERE m.user_id=$1 AND m.left_at IS NULL ORDER BY g.created_at ASC`, [userId]),
      manager.query(`SELECT count(*)::int AS count FROM squad_invitations WHERE invitee_id=$1 AND status='claimed' AND expires_at>now()`, [userId]),
      manager.query(`SELECT share_activity,share_records,revision FROM squad_preferences WHERE user_id=$1`, [userId]),
    ]);
    const ids = [userId, ...(friends as any[]).map(row => row.id as string)];
    const [{ stats, events }, prefs] = await Promise.all([squadStats(manager, ids), this.preferenceRows(manager, ids)]);
    const person = (row: any, self = false) => {
      const preference = prefs.get(row.id);
      return { id: row.id, name: row.first_name?.trim() || (self ? 'Toi' : 'Membre'),
        details: true, shareActivity: self || preference?.share_activity !== false,
        stats: summary(stats.get(row.id), true, self || preference?.share_records === true) };
    };
    const visibleFriends = new Set((friends as any[]).filter(row => prefs.get(row.id)?.share_activity !== false).map(row => row.id));
    visibleFriends.add(userId);
    return { self: person(people[0] ?? { id: userId }, true), friends: (friends as any[]).map(row => person(row)), groups,
      inboxCount: Number(inbox[0]?.count ?? 0),
      preferences: { shareActivity: preferences[0]?.share_activity ?? true, shareRecords: preferences[0]?.share_records ?? false,
        revision: preferences[0]?.revision ?? 0 },
      activity: events.filter(event => visibleFriends.has(event.userId)).slice(0, 20) };
  }
  async group(userId: string, groupId: string) {
    const manager = this.db.manager;
    const group = await this.activeMember(manager, userId, groupId);
    const [people, friends, challenges] = await Promise.all([
      manager.query(`SELECT u.id,u.first_name,m.role,m.joined_at FROM squad_memberships m JOIN users u ON u.id=m.user_id
        WHERE m.group_id=$1 AND m.left_at IS NULL ORDER BY m.joined_at ASC`, [groupId]),
      manager.query(`SELECT CASE WHEN user_a=$1 THEN user_b ELSE user_a END AS id FROM squad_friendships
        WHERE active=true AND (user_a=$1 OR user_b=$1)`, [userId]),
      manager.query(`SELECT * FROM squad_challenges WHERE group_id=$1 ORDER BY starts_at DESC LIMIT 6`, [groupId]),
    ]);
    const ids = (people as any[]).map(row => row.id as string);
    const joinedAt = new Map((people as any[]).map(row => [row.id as string, new Date(row.joined_at)]));
    const [{ stats, events }, prefs] = await Promise.all([squadStats(manager, ids, new Date(), joinedAt), this.preferenceRows(manager, ids)]);
    const friendIds = new Set((friends as any[]).map(row => row.id));
    const members = (people as any[]).map(row => {
      const detailed = row.id === userId || friendIds.has(row.id);
      const pref = prefs.get(row.id);
      return { id: row.id, name: row.first_name?.trim() || (row.id === userId ? 'Toi' : 'Membre'), role: row.role,
        details: detailed, isFriend: friendIds.has(row.id), shareActivity: row.id === userId || pref?.share_activity !== false,
        stats: summary(stats.get(row.id), detailed, row.id === userId || pref?.share_records === true) };
    });
    const challengeRows = await Promise.all((challenges as any[]).map(row => challengeCounts(manager, row)));
    const now = Date.now();
    const activeChallenge = challengeRows.find(item => Date.parse(item.startsAt) <= now && Date.parse(item.endsAt) > now) ?? null;
    const attendance = members.map(member => stats.get(member.id)?.attendance).filter((value): value is number => value !== null && value !== undefined);
    return { group: { id: group.id, name: group.name, ownerId: group.owner_id, revision: group.revision, memberCount: members.length,
        sessionsWeek: members.reduce((sum, member) => sum + member.stats.sessionsWeek, 0),
        attendance: attendance.length ? Math.round(attendance.reduce((sum, value) => sum + value, 0) / attendance.length) : null },
      members, activeChallenge, challengeHistory: challengeRows.filter(item => Date.parse(item.endsAt) <= now),
      activity: events.filter(event => event.userId === userId || prefs.get(event.userId)?.share_activity !== false).slice(0, 20).map(event => ({ ...event,
        sport: event.userId === userId || friendIds.has(event.userId) ? event.sport : 'session',
        minutes: event.userId === userId || friendIds.has(event.userId) ? event.minutes : 0 })) };
  }
  async invitations(userId: string) {
    const [incoming, outgoing] = await Promise.all([
      this.db.query(`SELECT i.id,i.kind,i.group_id,g.name AS group_name,i.created_at,i.expires_at,u.first_name AS inviter_name
        FROM squad_invitations i JOIN users u ON u.id=i.inviter_id LEFT JOIN squad_groups g ON g.id=i.group_id
        WHERE i.invitee_id=$1 AND i.status='claimed' AND i.expires_at>now() ORDER BY i.created_at DESC`, [userId]),
      this.db.query(`SELECT i.id,i.kind,i.status,i.group_id,g.name AS group_name,i.created_at,i.expires_at
        FROM squad_invitations i LEFT JOIN squad_groups g ON g.id=i.group_id
        WHERE i.inviter_id=$1 AND i.expires_at>now() AND i.status IN ('open','claimed') ORDER BY i.created_at DESC LIMIT 30`, [userId]),
    ]);
    return { incoming, outgoing };
  }
  async createGroup(userId: string, input: z.infer<typeof createGroupSchema>) {
    return this.db.transaction(async manager => {
      const [existing] = await manager.query('SELECT id,name,owner_id,revision FROM squad_groups WHERE owner_id=$1 AND create_request_id=$2', [userId, input.requestId]);
      if (existing) return { id: existing.id, name: existing.name, ownerId: existing.owner_id, revision: existing.revision };
      await manager.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const [group] = await manager.query(`INSERT INTO squad_groups(name,owner_id,create_request_id) VALUES($1,$2,$3)
        RETURNING id,name,owner_id,revision`, [input.name, userId, input.requestId]);
      await manager.query(`INSERT INTO squad_memberships(group_id,user_id,role) VALUES($1,$2,'owner')`, [group.id, userId]);
      await this.journal(manager, userId, input.requestId, 'squad.group.created', { groupId: group.id, name: input.name });
      return { id: group.id, name: group.name, ownerId: group.owner_id, revision: group.revision };
    });
  }
  async renameGroup(userId: string, groupId: string, input: z.infer<typeof renameGroupSchema>) {
    return this.db.transaction(async manager => {
      if (await this.receipt(manager, userId, input.requestId, 'squad.group.renamed')) return { ok: true };
      const [group] = await manager.query('SELECT * FROM squad_groups WHERE id=$1 FOR UPDATE', [groupId]);
      if (!group) throw new NotFoundException('Groupe introuvable.');
      await this.activeMember(manager, userId, groupId);
      if (group.owner_id !== userId) throw new ForbiddenException('Seul le créateur peut renommer le groupe.');
      if (group.revision !== input.revision) throw new ConflictException('Le groupe a changé. Recharge-le.');
      await manager.query('UPDATE squad_groups SET name=$2,revision=revision+1,updated_at=now() WHERE id=$1', [groupId, input.name]);
      await this.journal(manager, userId, input.requestId, 'squad.group.renamed', { groupId, before: group.name, after: input.name });
      return { ok: true };
    });
  }
  async transfer(userId: string, groupId: string, input: z.infer<typeof transferSchema>) {
    return this.db.transaction(async manager => {
      if (await this.receipt(manager, userId, input.requestId, 'squad.group.transferred')) return { ok: true };
      const [group] = await manager.query('SELECT * FROM squad_groups WHERE id=$1 FOR UPDATE', [groupId]);
      if (!group) throw new NotFoundException('Groupe introuvable.');
      if (group.owner_id !== userId) throw new ForbiddenException();
      const [member] = await manager.query('SELECT user_id FROM squad_memberships WHERE group_id=$1 AND user_id=$2 AND left_at IS NULL', [groupId, input.userId]);
      if (!member || input.userId === userId) throw new BadRequestException('Choisis un autre membre du groupe.');
      await manager.query("UPDATE squad_memberships SET role='member' WHERE group_id=$1 AND user_id=$2", [groupId, userId]);
      await manager.query("UPDATE squad_memberships SET role='owner' WHERE group_id=$1 AND user_id=$2", [groupId, input.userId]);
      await manager.query('UPDATE squad_groups SET owner_id=$2,revision=revision+1,updated_at=now() WHERE id=$1', [groupId, input.userId]);
      await this.journal(manager, userId, input.requestId, 'squad.group.transferred', { groupId, before: userId, after: input.userId });
      return { ok: true };
    });
  }
  async leave(userId: string, groupId: string, input: z.infer<typeof actionSchema>) {
    return this.db.transaction(async manager => {
      if (await this.receipt(manager, userId, input.requestId, 'squad.group.left')) return { ok: true };
      const group = await this.activeMember(manager, userId, groupId);
      if (group.owner_id === userId) {
        const [count] = await manager.query('SELECT count(*)::int AS members FROM squad_memberships WHERE group_id=$1 AND left_at IS NULL', [groupId]);
        if (Number(count.members) > 1) throw new ConflictException('Transfère le groupe à un membre avant de le quitter.');
      }
      await manager.query('UPDATE squad_memberships SET left_at=now() WHERE group_id=$1 AND user_id=$2 AND left_at IS NULL', [groupId, userId]);
      await manager.query(`UPDATE squad_challenge_participants p SET left_at=now() FROM squad_challenges c
        WHERE p.challenge_id=c.id AND c.group_id=$1 AND p.user_id=$2 AND c.ends_at>now() AND p.left_at IS NULL`, [groupId, userId]);
      await this.journal(manager, userId, input.requestId, 'squad.group.left', { groupId });
      return { ok: true };
    });
  }
  async removeFriend(userId: string, friendId: string, input: z.infer<typeof actionSchema>) {
    return this.db.transaction(async manager => {
      if (await this.receipt(manager, userId, input.requestId, 'squad.friend.removed')) return { ok: true };
      const [a, b] = pair(userId, friendId);
      const [row] = await manager.query('SELECT active FROM squad_friendships WHERE user_a=$1 AND user_b=$2 FOR UPDATE', [a, b]);
      if (!row?.active) throw new NotFoundException('Amitié introuvable.');
      await manager.query('UPDATE squad_friendships SET active=false,updated_at=now() WHERE user_a=$1 AND user_b=$2', [a, b]);
      await this.journal(manager, userId, input.requestId, 'squad.friend.removed', { friendId });
      return { ok: true };
    });
  }
  async preferences(userId: string, input: z.infer<typeof preferenceSchema>) {
    return this.db.transaction(async manager => {
      if (await this.receipt(manager, userId, input.requestId, 'squad.preferences.updated')) return { ok: true };
      await manager.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const [before] = await manager.query('SELECT * FROM squad_preferences WHERE user_id=$1 FOR UPDATE', [userId]);
      if ((before?.revision ?? 0) !== input.revision) throw new ConflictException('Tes réglages ont changé. Recharge-les.');
      await manager.query(`INSERT INTO squad_preferences(user_id,share_activity,share_records) VALUES($1,$2,$3)
        ON CONFLICT(user_id) DO UPDATE SET share_activity=EXCLUDED.share_activity,share_records=EXCLUDED.share_records,
        revision=squad_preferences.revision+1,updated_at=now()`, [userId, input.shareActivity, input.shareRecords]);
      await this.journal(manager, userId, input.requestId, 'squad.preferences.updated', { before: before ?? null,
        after: { shareActivity: input.shareActivity, shareRecords: input.shareRecords } });
      return { ok: true };
    });
  }
  async createInvitation(userId: string, input: z.infer<typeof inviteSchema>) {
    return this.db.transaction(async manager => {
      const tokenHash = hash(input.token);
      const [old] = await manager.query('SELECT * FROM squad_invitations WHERE token_hash=$1', [tokenHash]);
      if (old) {
        if (old.inviter_id !== userId || old.kind !== input.kind || old.group_id !== (input.groupId ?? null)) throw new ConflictException('Lien déjà utilisé.');
        return { id: old.id, token: input.token, expiresAt: new Date(old.expires_at).toISOString() };
      }
      if (input.kind === 'group') await this.activeMember(manager, userId, input.groupId!);
      const [row] = await manager.query(`INSERT INTO squad_invitations(token_hash,kind,inviter_id,group_id,expires_at)
        VALUES($1,$2,$3,$4,now()+interval '7 days') RETURNING id,expires_at`, [tokenHash, input.kind, userId, input.groupId ?? null]);
      await this.journal(manager, userId, input.token, 'squad.invitation.created', { invitationId: row.id, kind: input.kind, groupId: input.groupId ?? null });
      return { id: row.id, token: input.token, expiresAt: new Date(row.expires_at).toISOString() };
    });
  }
  async claim(userId: string, token: string) {
    return this.db.transaction(async manager => {
      const [row] = await manager.query('SELECT * FROM squad_invitations WHERE token_hash=$1 FOR UPDATE', [hash(token)]) as InvitationRow[];
      if (!row || row.expires_at.getTime() <= Date.now()) throw new NotFoundException('Ce lien a expiré. Demande une nouvelle invitation.');
      if (row.inviter_id === userId) throw new BadRequestException('Tu ne peux pas utiliser ta propre invitation.');
      if (row.status === 'claimed' && row.invitee_id === userId) return { id: row.id, kind: row.kind, groupId: row.group_id };
      if (row.status !== 'open') throw new ConflictException('Cette invitation a déjà été utilisée.');
      if (row.kind === 'group') {
        await this.activeMember(manager, row.inviter_id, row.group_id!);
        const [joined] = await manager.query('SELECT user_id FROM squad_memberships WHERE group_id=$1 AND user_id=$2 AND left_at IS NULL', [row.group_id, userId]);
        if (joined) throw new ConflictException('Tu fais déjà partie de ce groupe.');
      } else {
        const [a, b] = pair(userId, row.inviter_id);
        const [friend] = await manager.query('SELECT active FROM squad_friendships WHERE user_a=$1 AND user_b=$2', [a, b]);
        if (friend?.active) throw new ConflictException('Vous êtes déjà amis.');
      }
      await manager.query("UPDATE squad_invitations SET invitee_id=$2,status='claimed',updated_at=now() WHERE id=$1", [row.id, userId]);
      await this.journal(manager, userId, randomUUID(), 'squad.invitation.claimed', { invitationId: row.id, kind: row.kind });
      return { id: row.id, kind: row.kind, groupId: row.group_id };
    });
  }
  async resolve(userId: string, invitationId: string, accept: boolean) {
    return this.db.transaction(async manager => {
      const [row] = await manager.query('SELECT * FROM squad_invitations WHERE id=$1 FOR UPDATE', [invitationId]) as InvitationRow[];
      if (!row || row.invitee_id !== userId) throw new NotFoundException('Invitation introuvable.');
      if (row.status === (accept ? 'accepted' : 'declined')) return { ok: true };
      if (row.status !== 'claimed' || row.expires_at.getTime() <= Date.now()) throw new ConflictException('Cette invitation n’est plus disponible.');
      if (accept) {
        if (row.kind === 'group') {
          await this.activeMember(manager, row.inviter_id, row.group_id!);
          await manager.query(`INSERT INTO squad_memberships(group_id,user_id,role) VALUES($1,$2,'member')
            ON CONFLICT(group_id,user_id) DO UPDATE SET role='member',joined_at=now(),left_at=NULL`, [row.group_id, userId]);
        } else {
          const [a, b] = pair(userId, row.inviter_id);
          await manager.query(`INSERT INTO squad_friendships(user_a,user_b) VALUES($1,$2)
            ON CONFLICT(user_a,user_b) DO UPDATE SET active=true,updated_at=now()`, [a, b]);
        }
      }
      await manager.query('UPDATE squad_invitations SET status=$2,resolved_at=now(),updated_at=now() WHERE id=$1', [invitationId, accept ? 'accepted' : 'declined']);
      await this.journal(manager, userId, randomUUID(), accept ? 'squad.invitation.accepted' : 'squad.invitation.declined',
        { invitationId, kind: row.kind, inviterId: row.inviter_id, groupId: row.group_id });
      return { ok: true };
    });
  }
  async createChallenge(userId: string, groupId: string, input: z.infer<typeof challengeSchema>) {
    return this.db.transaction(async manager => {
      const [old] = await manager.query('SELECT id FROM squad_challenges WHERE create_request_id=$1 AND created_by=$2', [input.requestId, userId]);
      if (old) return { id: old.id };
      const [group] = await manager.query('SELECT * FROM squad_groups WHERE id=$1 FOR UPDATE', [groupId]);
      if (!group) throw new NotFoundException('Groupe introuvable.');
      await this.activeMember(manager, userId, groupId);
      if (group.owner_id !== userId) throw new ForbiddenException('Seul le créateur peut lancer un challenge.');
      const [active] = await manager.query('SELECT id FROM squad_challenges WHERE group_id=$1 AND ends_at>now() LIMIT 1', [groupId]);
      if (active) throw new ConflictException('Un challenge est déjà en cours.');
      const [row] = await manager.query(`INSERT INTO squad_challenges(group_id,title,target_sessions,min_minutes,starts_at,ends_at,created_by,create_request_id)
        VALUES($1,$2,$3,30,now(),now()+($4::int * interval '1 day'),$5,$6) RETURNING id`,
      [groupId, input.title, input.targetSessions, input.durationDays, userId, input.requestId]);
      await manager.query(`INSERT INTO squad_challenge_participants(challenge_id,user_id)
        SELECT $1,user_id FROM squad_memberships WHERE group_id=$2 AND left_at IS NULL`, [row.id, groupId]);
      await this.journal(manager, userId, input.requestId, 'squad.challenge.created', { groupId, challengeId: row.id,
        title: input.title, targetSessions: input.targetSessions, durationDays: input.durationDays });
      return { id: row.id };
    });
  }
}
