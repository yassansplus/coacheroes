require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User } = require('../dist/database/entities');
const { projectBadges, workoutBadgeCounts } = require('../dist/game/game.badges');
const { GameService } = require('../dist/game/game.service');
const migrations = fs.readdirSync(path.join(__dirname, '../dist/database/migrations')).filter(file => file.endsWith('.js')).sort()
  .flatMap(file => Object.values(require('../dist/database/migrations/' + file)));

test('badge workout counts use completed measurements and deduplicate planned occurrences', () => {
  const make = (id, name, reps, extra = {}) => ({ id, started_at: new Date('2026-09-01'), snapshot: {
    workout: { name: 'Boxe', programVersionId: 'block', week: 1, sessionIndex: 0 },
    exercises: [{ name, equipment: 'Barre de traction', sets: [{ reps, warmup: false, ...extra }] }],
  } });
  const rows = [make('a', 'Tractions assistées', 20), make('b', 'Tractions', 15, { warmup: true }),
    make('c', 'Pull-ups', 10), make('d', 'Tractions australiennes', 30)];
  assert.deepEqual(workoutBadgeCounts(rows), { workouts: 1, boxing: 1, pullups: 10 });
  assert.equal(workoutBadgeCounts([make('e', 'Tirage vertical', 30)]).pullups, 0);
});

test('eight badges unlock from real data, survive corrections and acknowledge per account', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations,
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const user = await db.getRepository(User).save({ appleSubject: 'badges-user' });
  const other = await db.getRepository(User).save({ appleSubject: 'badges-other' });
  const today = new Date().toISOString().slice(0, 10);
  const read = (id = user.id) => db.transaction(manager => projectBadges(manager, id, 'UTC', today));
  let badges = await read();
  assert.equal(badges.length, 8);
  assert.ok(badges.every(b => b.current === 0 && b.unlockedAt === null));
  await db.query(`INSERT INTO daily_check_ins(user_id,date,timezone,completed_at,data)
    VALUES($1,$2,'UTC',now(),'{"sleepMinutes":420}')`, [user.id, today]);
  badges = await read();
  assert.deepEqual(badges.filter(b => b.unlockedAt).map(b => b.id), ['first_checkin']);
  assert.equal(badges.find(b => b.id === 'sleep').current, 1);
  const firstUnlock = badges[0].unlockedAt;
  assert.equal((await read())[0].unlockedAt, firstUnlock);

  const snapshot = { workout: { name: 'Boxe', sport: 'boxing' }, exercises: [{ name: 'Tractions', equipment: 'Barre', sets: [{ reps: 10, warmup: false }] }] };
  await db.query(`INSERT INTO workout_sessions(id,user_id,revision,status,started_at,ended_at,snapshot,summary)
    VALUES($1,$2,1,'in_progress',now(),NULL,$3,'{}')`, [randomUUID(), user.id, JSON.stringify(snapshot)]);
  assert.equal((await read()).find(b => b.id === 'first_workout').unlockedAt, null);
  await db.query(`INSERT INTO workout_sessions(id,user_id,revision,status,started_at,ended_at,snapshot,summary)
    VALUES($1,$2,1,'completed',now()-interval '1 hour',now()-interval '1 minute',$3,'{}')`, [randomUUID(), user.id, JSON.stringify(snapshot)]);
  badges = await read();
  assert.deepEqual(badges.filter(b => b.unlockedAt).map(b => b.id), ['first_checkin', 'first_workout', 'pullups']);
  const service = new GameService(db);
  await service.celebrateBadges(other.id, ['first_checkin']);
  assert.equal((await read())[0].celebratedAt, null);
  await service.celebrateBadges(user.id, ['first_checkin', 'first_workout']);
  const celebrated = (await read())[0].celebratedAt;
  await service.celebrateBadges(user.id, ['first_checkin']);
  assert.equal((await read())[0].celebratedAt, celebrated);
  assert.equal((await read()).find(b => b.id === 'pullups').celebratedAt, null);

  await db.query(`INSERT INTO workout_sessions(id,user_id,revision,status,started_at,ended_at,snapshot,summary)
    SELECT gen_random_uuid(),$1,1,'completed',now()-interval '1 hour',now()-interval '1 minute',$2::jsonb,'{}'::jsonb FROM generate_series(1,99)`,
    [user.id, JSON.stringify(snapshot)]);
  await db.query(`INSERT INTO daily_check_ins(user_id,date,timezone,completed_at,data)
    SELECT $1,$2::date-day,'UTC',now(),'{"sleepMinutes":420}'::jsonb FROM generate_series(1,29) day`, [user.id, today]);
  // Unknown sleep and unfinished check-ins do not count.
  await db.query(`INSERT INTO daily_check_ins(user_id,date,timezone,completed_at,data)
    VALUES($1,$2::date-31,'UTC',now(),NULL),($1,$2::date-32,'UTC',NULL,'{"sleepMinutes":480}')`, [user.id, today]);
  const block = randomUUID();
  await db.query(`INSERT INTO program_blocks(id,user_id,prescription,started_at,ends_at)
    VALUES($1,$2,'{}',$3::timestamptz-interval '100 days',$3::timestamptz+interval '1 day')`, [block, user.id, `${today}T12:00:00Z`]);
  await db.query(`INSERT INTO nutrition_meals(id,user_id,date,snapshot)
    SELECT gen_random_uuid(),$1,$2::date-day,'{"totals":{"protein":150}}'::jsonb FROM generate_series(0,49) day`, [user.id, today]);
  assert.equal((await read()).find(b => b.id === 'protein').current, 0, 'missing goals must not be invented');
  await db.query(`INSERT INTO nutrition_plans(program_run_id,user_id,status,context,targets)
    VALUES($1,$2,'ready','{}','{"protein":150}')`, [block, user.id]);
  await db.query(`UPDATE nutrition_meals SET deleted_at=now() WHERE user_id=$1 AND date=$2`, [user.id, today]);
  assert.equal((await read()).find(b => b.id === 'protein').current, 49);
  await db.query(`UPDATE nutrition_meals SET deleted_at=NULL WHERE user_id=$1 AND date=$2`, [user.id, today]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM nutrition_meals WHERE user_id=$1 AND deleted_at IS NULL', [user.id]))[0].n, 50);
  badges = await read();
  assert.ok(badges.every(b => b.unlockedAt), JSON.stringify(badges.filter(b => !b.unlockedAt)));
  assert.ok((await read(other.id)).every(b => b.unlockedAt === null));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM game_badges WHERE user_id=$1', [user.id]))[0].n, 8);

  await db.query('UPDATE daily_check_ins SET data=NULL,completed_at=NULL WHERE user_id=$1', [user.id]);
  await db.query('UPDATE workout_sessions SET status=\'abandoned\' WHERE user_id=$1', [user.id]);
  await db.query('UPDATE nutrition_meals SET deleted_at=now() WHERE user_id=$1', [user.id]);
  await db.query('DELETE FROM journal_entries WHERE user_id=$1', [user.id]);
  const retained = await read();
  assert.deepEqual(retained.map(b => b.unlockedAt), badges.map(b => b.unlockedAt));
  assert.ok(retained.every(b => b.current === b.target));
});
