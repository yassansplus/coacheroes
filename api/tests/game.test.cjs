require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User, JournalEntry } = require('../dist/database/entities');
const { GameService } = require('../dist/game/game.service');
const { weekOf, levelProgress } = require('../dist/game/game.rules');
const migrations = fs.readdirSync(path.join(__dirname, '../dist/database/migrations')).filter(file => file.endsWith('.js')).sort()
  .flatMap(file => Object.values(require('../dist/database/migrations/' + file)));

test('XP is server-owned, capped, idempotent and keeps its history after journal deletion', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations,
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const user = await db.getRepository(User).save({ appleSubject: 'game-user' });
  const service = new GameService(db);
  const now = new Date(), today = now.toISOString().slice(0, 10);
  const journal = async (type, payload) => db.getRepository(JournalEntry).save({ userId: user.id, requestId: randomUUID(), type, occurredAt: now, payload });

  await journal('onboarding.completed', {});
  await journal('program.accepted', { runId: randomUUID() });
  await journal('daily.completed', { date: today });
  await journal('daily.corrected', { date: today });
  for (let i = 0; i < 3; i++) await journal('nutrition.meal.created', { mealId: randomUUID(), after: { date: today } });
  await journal('nutrition.meal.corrected', { after: { date: today } });
  for (let i = 0; i < 3; i++) await journal(i ? 'workout.completed' : 'workout.started', {
    sessionId: randomUUID(), after: { snapshot: { status: 'completed', workout: { kind: 'free' },
      endedAt: now.getTime(), timezone: 'UTC' } },
  });
  await journal('squad.group.created', { groupId: randomUUID() });
  await journal('squad.group.created', { groupId: randomUUID() });
  await journal('progression.weight.saved', { date: today });
  await journal('progression.measurements.saved', { date: today });
  await journal('profile.avatar.uploaded', {});
  await journal('progression.photos.saved', { date: today });

  const first = await service.get(user.id, null);
  assert.equal(first.total, 100 + 20 + 20 + 20 + 120 + 5 + 5 + 5);
  assert.equal(first.events.length, 0);
  assert.equal(first.missions.daily.meals, 2);
  assert.deepEqual({ level: first.level, xp: first.xp, target: first.target }, levelProgress(first.total));
  assert.equal((await service.get(user.id, first.latestEventId)).total, first.total);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM game_xp_events WHERE user_id=$1', [user.id]))[0].n, 10);

  const priorMonday = new Date(`${weekOf(today)}T12:00:00Z`);
  priorMonday.setUTCDate(priorMonday.getUTCDate() - 7);
  for (let day = 0; day < 4; day++) {
    const date = new Date(priorMonday); date.setUTCDate(date.getUTCDate() + day);
    await db.query('INSERT INTO daily_check_ins(user_id,date,timezone,completed_at) VALUES($1,$2,$3,$4)',
      [user.id, date.toISOString().slice(0, 10), 'UTC', date]);
  }
  const next = await service.get(user.id, first.latestEventId);
  assert.equal(next.total, first.total + 40);
  assert.deepEqual(next.events.map(item => item.rule), ['weekly.checkins']);
  assert.equal((await service.get(user.id, next.latestEventId)).events.length, 0);

  const blockId = randomUUID();
  const currentMonday = new Date(`${weekOf(today)}T12:00:00Z`);
  await db.query('INSERT INTO program_blocks(id,user_id,prescription,started_at,ends_at) VALUES($1,$2,$3,$4,$5)',
    [blockId, user.id, JSON.stringify({ output: { result: { sessions: [{ weekday: 0 }, { weekday: 1 }] } } }), priorMonday,
      new Date(currentMonday.getTime() + 21 * 86400000)]);
  for (let index = 0; index < 2; index++) {
    const sessionId = randomUUID();
    const snapshot = { status: 'completed', timezone: 'UTC', workout: { programVersionId: blockId, sessionIndex: index, week: 2 } };
    await db.query(`INSERT INTO workout_sessions(id,user_id,program_version_id,revision,status,started_at,ended_at,snapshot,summary)
      VALUES($1,$2,$3,1,'completed',$4,$5,$6,$7)`, [sessionId, user.id, blockId, currentMonday, currentMonday,
        JSON.stringify(snapshot), JSON.stringify({ durationSeconds: 1800 })]);
    await journal('workout.completed', { sessionId, after: { snapshot: { ...snapshot, endedAt: now.getTime() } } });
  }
  const planned = await service.get(user.id, next.latestEventId);
  assert.equal(planned.total, next.total + 280);
  assert.equal(planned.missions.weekly.plan.awarded, true);
  assert.deepEqual(planned.events.map(item => item.rule).sort(), ['weekly.plan', 'workout.planned', 'workout.planned'].sort());

  await journal('squad.invitation.accepted', { kind: 'friend', inviterId: randomUUID() });
  for (let index = 0; index < 20; index++) await journal('coach.proposal.applied', { proposalId: randomUUID() });
  const capped = await service.get(user.id, planned.latestEventId);
  assert.equal(capped.breakdown.micro, 50);
  assert.equal(capped.total, planned.total + 35);

  await db.query('DELETE FROM journal_entries WHERE user_id=$1', [user.id]);
  assert.equal((await service.get(user.id, capped.latestEventId)).total, capped.total);
});
