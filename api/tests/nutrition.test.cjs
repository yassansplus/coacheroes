require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { ConfigService } = require('@nestjs/config');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User, Onboarding, JournalEntry } = require('../dist/database/entities');
const { TrainingProgram } = require('../dist/program/program.entity');
const { NutritionPlan, NutritionMeal, NutritionCoachOpinion } = require('../dist/nutrition/nutrition.entity');
const { NutritionCatalog } = require('../dist/nutrition/nutrition-catalog');
const { NutritionService } = require('../dist/nutrition/nutrition.service');
const { NutritionCoachContext } = require('../dist/nutrition/nutrition-coach-context');
const { mealWriteSchema } = require('../dist/nutrition/nutrition.schema');
const { profile, plan } = require('./program-fixtures.cjs');

async function database(t) {
  const migrations = fs.readdirSync(path.join(__dirname, '../dist/database/migrations')).filter(name => name.endsWith('.js')).sort().flatMap(name => Object.values(require('../dist/database/migrations/' + name)));
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations, synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy()); return db;
}
function write(id, foodId, requestId = randomUUID(), revision = 0, amount = 100) {
  return { id, requestId, revision, date: '2026-09-22', moment: 'Midi', time: '12:30', source: 'manual', description: '', items: [{ id: randomUUID(), foodId, amount }] };
}
test('nutrition goals follow the generated program and become active only after acceptance', async t => {
  const db = await database(t);
  const user = await db.getRepository(User).save({ appleSubject: 'nutrition-plan' });
  await db.getRepository(Onboarding).save({ userId: user.id, profile: profile(), revision: 1, completedAt: new Date() });
  const firstRun = randomUUID();
  await db.getRepository(TrainingProgram).save({ userId: user.id, sourceRevision: 1, status: 'ready', phase: 'validating', runId: firstRun, context: { schemaVersion: 2 }, output: { result: plan(), exercises: [] }, acceptedAt: null });
  const called = [];
  const ai = { plan: async (profile, program, baseline) => {
    called.push({ profile, program, baseline });
    return { targets: { calories: 2500, protein: 150, carbs: 300, fat: 78, coachNote: 'On avance avec un objectif adapté à tes séances.', assumptions: [] }, trace: { model: 'mock' } };
  } };
  const service = new NutritionService(db, ai, new NutritionCatalog(db, new ConfigService()), new NutritionCoachContext(db));
  await service.tick();
  assert.equal(called.length, 1);
  assert.equal(called[0].profile.objective[0], 'muscle');
  assert.equal(called[0].program.sessions[0].estimatedMinutes, 20);
  assert.equal((await db.getRepository(NutritionPlan).findOneByOrFail({ programRunId: firstRun })).status, 'ready');
  assert.equal(await service.activePlan(user.id), null);
  await db.getRepository(TrainingProgram).update({ userId: user.id }, { acceptedAt: new Date() });
  assert.equal((await service.activePlan(user.id)).targets.calories, 2500);
  const nextRun = randomUUID();
  await db.getRepository(TrainingProgram).update({ userId: user.id }, { runId: nextRun, acceptedAt: null });
  await service.tick();
  assert.equal(called.length, 2);
  assert.equal((await db.getRepository(NutritionPlan).find()).length, 2);
  assert.equal(await service.activePlan(user.id), null);
});
test('nutrition meals update one row, audit corrections, survive journal deletion and soft-delete', async t => {
  const db = await database(t);
  const user = await db.getRepository(User).save({ appleSubject: 'nutrition-meals' });
  const other = await db.getRepository(User).save({ appleSubject: 'nutrition-other' });
  const catalog = new NutritionCatalog(db, new ConfigService());
  const food = await catalog.createManual(user.id, 'Aliment test', { calories: 100, protein: 10, carbs: 12, fat: 2 }, 'g', 100);
  const service = new NutritionService(db, { plan: async () => { throw new Error('unused'); }, analyze: async () => { throw new Error('unused'); } }, catalog, new NutritionCoachContext(db));
  const id = randomUUID(), first = write(id, food.id);
  const saved = await service.saveMeal(user.id, first);
  assert.equal(saved.revision, 1);
  assert.equal(saved.totals.calories, 100);
  assert.equal((await service.saveMeal(user.id, first)).revision, 1);
  await assert.rejects(service.saveMeal(other.id, write(randomUUID(), food.id)), { status: 400 });
  const second = { ...write(id, food.id, randomUUID(), 1, 200), items: [{ ...first.items[0], amount: 200 }] };
  const corrected = await service.saveMeal(user.id, second);
  assert.equal(corrected.revision, 2);
  assert.equal(corrected.totals.calories, 200);
  assert.equal((await db.getRepository(NutritionMeal).find()).length, 1);
  const audit = await db.getRepository(JournalEntry).findOneByOrFail({ userId: user.id, type: 'nutrition.meal.corrected' });
  assert.equal(audit.payload.before.items[0].amount, 100);
  assert.equal(audit.payload.after.items[0].amount, 200);
  await assert.rejects(service.saveMeal(user.id, { ...second, requestId: randomUUID(), revision: 1 }), { status: 409 });
  await db.query('DELETE FROM journal_entries WHERE user_id=$1', [user.id]);
  assert.equal((await service.saveMeal(user.id, second)).revision, 2);
  await service.deleteMeal(user.id, id);
  assert.equal((await service.dashboard(user.id)).meals.length, 0);
  assert.equal((await db.getRepository(NutritionMeal).findOneByOrFail({ id })).revision, 3);
});
test('text analysis saves its own estimated banana without catalog lookup and keeps the stated quantity', async t => {
  const db = await database(t);
  const user = await db.getRepository(User).save({ appleSubject: 'nutrition-estimate' });
  const catalog = new NutritionCatalog(db, new ConfigService());
  catalog.search = async () => { throw new Error('The AI flow must not search the catalog'); };
  const ai = { analyze: async () => ({ analysis: { foods: [{ name: 'banane', brand: null, estimatedAmount: 120,
    unit: 'g', amountIsEstimated: false, preparation: null, confidence: 'medium', needsConfirmation: false,
    per100: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 }, macroSource: 'estimated', sourceUrl: null }],
    clarificationQuestion: null }, trace: { model: 'mock' } }) };
  const service = new NutritionService(db, ai, catalog, new NutritionCoachContext(db));
  const analysis = await service.analyze(user.id, 'text', '120 g de banane');
  assert.equal(analysis.items.length, 1);
  assert.equal(analysis.items[0].amount, 120);
  assert.equal(analysis.foods[0].provider, 'ai_estimate');
  assert.equal(analysis.foods[0].per100.calories, 89);
  const input = mealWriteSchema.parse({ id: randomUUID(), requestId: randomUUID(), revision: 0, date: '2026-09-23',
    moment: 'Midi', time: '12:30', source: 'text', description: '120 g de banane', items: analysis.items });
  const saved = await service.saveMeal(user.id, input);
  assert.equal(saved.totals.calories, 106.8);
  assert.equal(saved.items[0].food.provider, 'ai_estimate');
  assert.equal((await service.dashboard(user.id)).foods[0].name, 'banane');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM nutrition_foods'))[0].count, 0);
});
test('coach opinion keeps prior revisions and exposes seven dated days without account identity', async t => {
  const db = await database(t);
  const user = await db.getRepository(User).save({ appleSubject: 'coach-opinion', firstName: 'Yann', email: 'yann@example.com' });
  const catalog = new NutritionCatalog(db, new ConfigService());
  const food = await catalog.createManual(user.id, 'Poulet', { calories: 150, protein: 25, carbs: 0, fat: 4 }, 'g', 100);
  const context = new NutritionCoachContext(db);
  const seen = [];
  const service = new NutritionService(db, { opinion: async (meal, targets, tools) => {
    const journal = await tools.sevenDayJournal();
    const memory = await tools.coachMemory(0, 30);
    seen.push({ journal, memory, meal, targets });
    return { text: 'Bon repas, garde cette base après ta séance.', trace: { model: 'mock' } };
  } }, catalog, context);
  const id = randomUUID();
  const saved = await service.saveMeal(user.id, write(id, food.id));
  const first = await service.opinion(user.id, id);
  assert.equal(first.coachOpinion.basedOnRevision, 1);
  assert.equal((await service.opinion(user.id, id)).coachOpinion.text, first.coachOpinion.text);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].journal.length, 7);
  assert.equal(seen[0].journal[6].date, '2026-09-22');
  assert.equal(seen[0].journal[6].meals[0].foods[0].name, 'Poulet');
  assert.ok(!JSON.stringify(seen[0]).includes(user.email));
  const corrected = await service.saveMeal(user.id, write(id, food.id, randomUUID(), saved.revision, 200));
  assert.equal(corrected.coachOpinion, undefined);
  await service.opinion(user.id, id);
  assert.equal(seen[1].memory.messages[0].text, first.coachOpinion.text);
  assert.equal((await db.getRepository(NutritionCoachOpinion).findBy({ userId: user.id })).length, 2);
  await assert.rejects(db.query('DELETE FROM nutrition_coach_opinions WHERE user_id=$1', [user.id]));
});
test('barcode catalog keeps a stable sourced per-100ml snapshot and reuses it', async t => {
  const db = await database(t), catalog = new NutritionCatalog(db, new ConfigService());
  const old = global.fetch;
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.match(String(url), /openfoodfacts\.org\/api\/v3\/product\/1234567890123/);
    assert.match(options.headers['User-Agent'], /CoacHeroes/);
    return new Response(JSON.stringify({ product: { product_name: 'Boisson test', nutriments: {
      'energy-kcal_100ml': 42, proteins_100ml: 0, carbohydrates_100ml: 10.5, fat_100ml: 0,
    } } }), { status: 200 });
  };
  t.after(() => { global.fetch = old; });
  const food = await catalog.barcode('1234567890123');
  assert.equal(food.baseUnit, 'ml');
  assert.equal(food.per100.calories, 42);
  assert.equal(food.provider, 'open_food_facts');
  assert.equal((await catalog.barcode('1234567890123')).id, food.id);
  assert.equal(calls, 1);
});
