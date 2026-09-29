require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User } = require('../dist/database/entities');
const { GameService } = require('../dist/game/game.service');
const { GameController } = require('../dist/game/game.controller');
const { longestCheckinStreak } = require('../dist/game/game.rewards');
const migrations = fs.readdirSync(path.join(__dirname, '../dist/database/migrations')).filter(file => file.endsWith('.js')).sort()
  .flatMap(file => Object.values(require('../dist/database/migrations/' + file)));

test('streaks count consecutive unique calendar days across month boundaries', () => {
  assert.equal(longestCheckinStreak([]), 0);
  assert.equal(longestCheckinStreak(['2026-10-01', '2026-09-30', '2026-09-30', '2026-09-28']), 2);
});
test('equipment validation rejects unknown choices and client-owned unlock flags', () => {
  const controller = new GameController({ equip: () => assert.fail('Invalid input reached persistence') });
  assert.throws(() => controller.equip({ session: { userId: 'owner' } }, { frame: 'azur', title: 'none', theme: 'light', unlocked: true }));
  assert.throws(() => controller.equip({ session: { userId: 'owner' } }, { frame: 'unknown', title: 'none', theme: 'light' }));
});
test('real unlocks authorize equipment, saved per account across service restarts, with no invented defaults', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations,
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const owner = await db.getRepository(User).save({ appleSubject: 'reward-owner' });
  const other = await db.getRepository(User).save({ appleSubject: 'reward-other' });
  const service = new GameService(db);
  const empty = await service.get(owner.id, null);
  assert.deepEqual(empty.equipment, { frame: 'none', title: 'none', theme: 'light' });
  assert.deepEqual(empty.unlockedRewards, ['light']);
  await assert.rejects(service.equip(owner.id, { frame: 'azur', title: 'confirmed', theme: 'light' }), /pas encore débloqué/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM game_equipment'))[0].n, 0);

  const today = new Date();
  const dateAgo = days => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - days, 12)).toISOString().slice(0, 10);
  const addDay = (date, completed = true) => db.query('INSERT INTO daily_check_ins(user_id,date,timezone,completed_at) VALUES($1,$2,$3,$4)',
    [owner.id, date, 'UTC', completed ? new Date(date + 'T12:00:00Z') : null]);
  // The current streak is broken: a historical best still earns Assidu.
  for (let ago = 2; ago < 15; ago++) await addDay(dateAgo(ago));
  await addDay(dateAgo(1), false);
  await addDay(dateAgo(-1)); // Future rows cannot extend a real streak.
  assert.ok(!(await service.get(owner.id, null)).unlockedRewards.includes('regular'));
  await assert.rejects(service.equip(owner.id, { frame: 'none', title: 'regular', theme: 'light' }), /pas encore débloqué/);
  await addDay(dateAgo(15));
  assert.ok((await service.get(owner.id, null)).unlockedRewards.includes('regular'));
  await service.equip(owner.id, { frame: 'none', title: 'regular', theme: 'light' });
  assert.equal((await new GameService(db).get(owner.id, null)).equipment.title, 'regular');
  assert.equal((await service.get(other.id, null)).equipment.title, 'none');
  await assert.rejects(service.equip(other.id, { frame: 'none', title: 'regular', theme: 'light' }), /pas encore débloqué/);

  await db.query(`INSERT INTO game_xp_events(user_id,rule,source_key,category,title,xp,week_key,occurred_at)
    VALUES($1,'test','xp','training','Earned XP',5000,$2,now())`, [owner.id, dateAgo(0)]);
  const unlocked = await service.get(owner.id, null);
  assert.deepEqual(new Set(unlocked.unlockedRewards), new Set(['azur', 'cobalt', 'confirmed', 'regular', 'light', 'violet']));
  const choice = { frame: 'cobalt', title: 'confirmed', theme: 'violet' };
  await service.equip(owner.id, choice);
  const [count] = await db.query("SELECT count(*)::int AS n FROM journal_entries WHERE user_id=$1 AND type='game.equipment.saved'", [owner.id]);
  await service.equip(owner.id, choice);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM journal_entries WHERE user_id=$1 AND type='game.equipment.saved'", [owner.id]))[0].n, count.n);
  assert.deepEqual((await new GameService(db).get(owner.id, null)).equipment, choice);
});
