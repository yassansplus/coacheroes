require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User, Onboarding, JournalEntry } = require('../dist/database/entities');
const { OnboardingService } = require('../dist/onboarding/onboarding.service');
const { DailyService } = require('../dist/daily/daily.service');
const { ProgressionService } = require('../dist/progression/progression.service');
const { Progression1791200000000 } = require('../dist/database/migrations/1791200000000-Progression');
const { WorkoutSession } = require('../dist/workouts/workout.entity');
const { summarizeWorkout } = require('../dist/workouts/workout.schema');
const { snapshot } = require('./workout-fixtures.cjs');
const { profile } = require('./program-fixtures.cjs');
const migrations = fs.readdirSync(path.join(__dirname, '../dist/database/migrations')).filter(file => file.endsWith('.js')).sort()
  .flatMap(file => Object.values(require('../dist/database/migrations/' + file)));
const previousDate = () => { const date = new Date(); date.setUTCDate(date.getUTCDate() - 1); return date.toISOString().slice(0, 10); };
const common = revision => ({ revision, requestId: randomUUID(), timezone: 'UTC' });

test('progression reuses onboarding, daily and workout data; corrections keep one row and a separate journal entry', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations,
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const user = await db.getRepository(User).save({ appleSubject: 'progression-user' });
  const other = await db.getRepository(User).save({ appleSubject: 'progression-other' });
  await db.getRepository(Onboarding).save({ userId: user.id, profile: {}, currentStep: 2, revision: 0 });
  await db.getRepository(Onboarding).save({ userId: other.id, profile: {}, currentStep: 2, revision: 0 });
  const onboarding = new OnboardingService(db);
  const starting = profile(); starting.photos = {}; starting.measurements = { waist: '86', chest: '', arms: '33', thighs: '' };
  starting.performances = [{ id: 'pullups', label: 'Tractions', value: 4, unit: 'rep.' }];
  await onboarding.save(user.id, { profile: starting, currentStep: 14, revision: 0,
    requestId: randomUUID(), occurredAt: new Date().toISOString(), timezone: 'UTC' }, true);
  const service = new ProgressionService(db), yesterday = previousDate();
  let view = await service.get(user.id);
  assert.equal(view.weights.at(-1).value, 76.5);
  assert.equal(view.measures.at(-1).waist, 86);
  assert.equal(view.measures.at(-1).chest, null);
  assert.equal(view.exercises.find(row => row.id === 'pullups').points[0].baseline, true);
  assert.equal((await service.get(other.id)).weights.length, 0);

  await db.query(`INSERT INTO daily_check_ins(user_id,date,timezone,data,completed_at) VALUES($1,$2,'UTC',$3,now())`,
    [user.id, yesterday, JSON.stringify({ weightKg: 78, sleepMinutes: 420, sleepQuality: 4 })]);
  const weightRequest = { ...common(0), value: 77.4 };
  await service.weight(user.id, yesterday, weightRequest);
  await service.weight(user.id, yesterday, weightRequest);
  view = await service.get(user.id);
  assert.equal(view.weights.find(row => row.date === yesterday).value, 77.4);
  assert.equal(view.sleep.find(row => row.date === yesterday).minutes, 420);
  assert.equal((await new DailyService(db).today(user.id, 'UTC')).reference.weight, 77.4);
  await assert.rejects(service.weight(user.id, yesterday, { ...common(0), value: 76 }), { status: 409 });
  await service.weight(user.id, yesterday, { ...common(1), value: 77.1 });
  assert.equal((await db.query('SELECT count(*)::int AS n FROM progression_weights WHERE user_id=$1 AND date=$2', [user.id, yesterday]))[0].n, 1);
  assert.equal((await db.getRepository(JournalEntry).countBy({ userId: user.id, type: 'progression.weight.saved' })), 2);

  const measurements = { waist: 85, chest: 100, arm: 34, thigh: 57 };
  await service.measurement(user.id, yesterday, { ...common(0), ...measurements });
  await service.measurement(user.id, yesterday, { ...common(1), ...measurements, waist: 84 });
  assert.equal((await service.get(user.id)).measures.find(row => row.date === yesterday).waist, 84);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM progression_measurements WHERE user_id=$1 AND date=$2', [user.id, yesterday]))[0].n, 1);

  const ownPhoto = await onboarding.upload(user.id, Buffer.from([255, 216, 255, 1]));
  const foreignPhoto = await onboarding.upload(other.id, Buffer.from([255, 216, 255, 2]));
  await assert.rejects(service.photo(user.id, yesterday, { ...common(0), images: { face: foreignPhoto.id } }), { status: 400 });
  await service.photo(user.id, yesterday, { ...common(0), images: { face: ownPhoto.id } });
  assert.equal((await service.get(user.id)).photos[0].images.face, ownPhoto.id);
  await service.removePhoto(user.id, yesterday, 'face', common(1));
  assert.equal((await service.get(user.id)).photos.length, 0);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM progression_photos WHERE user_id=$1', [user.id]))[0].n, 1);

  await service.boxing(user.id, yesterday, 'Sac', { ...common(0), value: 180 });
  await service.boxing(user.id, yesterday, 'Sac', { ...common(1), value: 190 });
  assert.equal((await service.get(user.id)).tests[0].value, 190);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM progression_boxing_tests WHERE user_id=$1', [user.id]))[0].n, 1);

  const workout = snapshot(); workout.status = 'completed'; workout.endedAt = Date.now();
  workout.startedAt = Date.now() - 1800000;
  workout.exercises[0].sets[0] = { id: randomUUID(), occurredAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    weight: 20, reps: 8, feeling: 'correct', warmup: false };
  await db.getRepository(WorkoutSession).save({ id: randomUUID(), userId: user.id, programVersionId: null, revision: 1,
    status: 'completed', startedAt: new Date(workout.startedAt), endedAt: new Date(workout.endedAt), snapshot: workout,
    summary: summarizeWorkout(workout), analysis: null, analysisAppliedAt: null });
  view = await service.get(user.id);
  assert.equal(view.sessions.find(row => row.status === 'completed').minutes, 30);
  assert.equal(view.exercises.find(row => row.id === workout.exercises[0].id).points.at(-1).weight, 20);
  assert.equal(view.exercises.find(row => row.id === workout.exercises[0].id).points.at(-1).estimatedMax > 20, true);
});

test('migration restores the original baseline after a program renewal changed the mutable profile', async t => {
  const baseMigrations = migrations.filter(migration => migration !== Progression1791200000000);
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations: baseMigrations,
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const user = await db.getRepository(User).save({ appleSubject: 'historical-baseline' });
  const original = profile(); original.photos = {}; original.weight = '76'; original.measurements.waist = '86';
  const current = structuredClone(original); current.weight = '72'; current.measurements.waist = '80';
  await db.getRepository(Onboarding).save({ userId: user.id, profile: current, currentStep: 14, revision: 2,
    completedAt: new Date('2026-09-01T12:00:00Z') });
  await db.query(`INSERT INTO journal_entries(user_id,request_id,type,occurred_at,recorded_at,payload) VALUES
    ($1,$2,'onboarding.completed','2026-09-01T12:00:00Z','2026-09-01T12:00:00Z',$3),
    ($1,$4,'onboarding.renewal_updated','2026-09-10T12:00:00Z','2026-09-10T12:00:00Z',$5)`,
    [user.id, randomUUID(), JSON.stringify({ timezone: 'Europe/Paris' }), randomUUID(), JSON.stringify({ before: { profile: original }, after: { profile: current } })]);
  const runner = db.createQueryRunner(); await runner.connect();
  try { await new Progression1791200000000().up(runner); } finally { await runner.release(); }
  const weights = await db.query('SELECT value_kg FROM progression_weights WHERE user_id=$1', [user.id]);
  const measures = await db.query('SELECT waist_cm FROM progression_measurements WHERE user_id=$1', [user.id]);
  assert.equal(weights[0].value_kg, 76);
  assert.equal(measures[0].waist_cm, 86);
});
