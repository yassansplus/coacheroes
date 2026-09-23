require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DataSource } = require('typeorm');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User, Onboarding, JournalEntry } = require('../dist/database/entities');
const { CoachConversation, CoachMessage, CoachProposal } = require('../dist/coach/coach.entity');
const { CoachService } = require('../dist/coach/coach.service');
const { TrainingProgram } = require('../dist/program/program.entity');
const { ProgramBlock } = require('../dist/workouts/workout.entity');
const { NutritionMeal } = require('../dist/nutrition/nutrition.entity');
const { profile, plan } = require('./program-fixtures.cjs');

async function database(t) {
  const migrations = fs.readdirSync(path.join(__dirname, '../dist/database/migrations')).filter(name => name.endsWith('.js')).sort().flatMap(name => Object.values(require('../dist/database/migrations/' + name)));
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations, synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy()); return db;
}
const noAction = { title: 'Mes progrès', reply: 'On regarde ça ensemble.', actionType: 'none', targetId: '', sessionIndex: 0, exerciseIndex: 0, sets: 0, rir: 0, amount: 0, reason: '' };
test('coach persists conversations, summarizes every five user turns and restricts access to the owner', async t => {
  const db = await database(t);
  const user = await db.getRepository(User).save({ appleSubject: 'coach-owner', firstName: 'Léo' });
  const other = await db.getRepository(User).save({ appleSubject: 'coach-other' });
  await db.getRepository(Onboarding).save({ userId: user.id, profile: profile(), revision: 1, completedAt: new Date() });
  const seen = [];
  const ai = { answer: async (base, history, summaries) => { seen.push({ base, history, summaries }); return { answer: noAction, trace: { model: 'mock' } }; },
    summarize: async () => ({ summary: 'L’utilisateur veut suivre sa progression.', trace: { model: 'mock' } }) };
  const service = new CoachService(db, ai, { sevenDayJournal: async () => [], coachMemory: async () => ({ messages: [] }) });
  let id = null;
  for (let i = 0; i < 5; i++) {
    const result = await service.send(user.id, id, randomUUID(), `Question ${i}`, '2026-09-23');
    id = result.id;
  }
  assert.equal((await service.list(user.id)).length, 1);
  assert.equal((await service.get(user.id, id)).messages.length, 10);
  assert.equal((await db.getRepository(CoachConversation).findOneByOrFail({ id })).summaryCount, 5);
  assert.equal((await db.getRepository(CoachConversation).findOneByOrFail({ id })).summary, 'L’utilisateur veut suivre sa progression.');
  assert.equal(seen[0].base.firstName, 'Léo');
  assert.equal((await db.getRepository(JournalEntry).findBy({ userId: user.id, type: 'coach.memory.updated' })).length, 1);
  await assert.rejects(service.get(other.id, id), { status: 404 });
  await assert.rejects(db.getRepository(CoachMessage).update({ conversationId: id }, { text: 'changed' }));
});
test('coach only applies a program change after acceptance and detects stale proposals', async t => {
  const db = await database(t);
  const user = await db.getRepository(User).save({ appleSubject: 'coach-program' });
  await db.getRepository(Onboarding).save({ userId: user.id, profile: profile(), revision: 1, completedAt: new Date() });
  const runId = randomUUID();
  const output = { result: plan(), exercises: [{ id: plan().sessions[0].exercises[0].exerciseId, name: 'Squat' }] };
  await db.getRepository(TrainingProgram).save({ userId: user.id, sourceRevision: 1, status: 'ready', phase: 'validating', runId, context: { schemaVersion: 2 }, output, acceptedAt: new Date() });
  await db.getRepository(ProgramBlock).save({ id: runId, userId: user.id, prescription: { output }, startedAt: new Date(), endsAt: new Date(Date.now() + 28 * 86400000) });
  const exercise = output.result.sessions[0].exercises[0];
  const ai = { answer: async (_base, _history, _memory, tool) => {
    await tool('get_program', {});
    return { answer: { ...noAction, title: 'Adapter ma séance', reply: 'Je te propose un peu moins de volume.', actionType: 'program_exercise',
      sessionIndex: 0, exerciseIndex: 0, sets: exercise.sets === 1 ? 2 : exercise.sets - 1, rir: 3 }, trace: { model: 'mock' } };
  } };
  const service = new CoachService(db, ai, { sevenDayJournal: async () => [], coachMemory: async () => ({ messages: [] }) });
  const first = await service.send(user.id, null, randomUUID(), 'Allège ma séance', '2026-09-23');
  const proposal = first.proposals[0];
  assert.equal(proposal.status, 'pending');
  assert.equal((await db.getRepository(TrainingProgram).findOneByOrFail({ userId: user.id })).output.result.sessions[0].exercises[0].sets, exercise.sets);
  const applied = await service.decide(user.id, first.id, proposal.id, 'applied');
  assert.equal(applied.proposals[0].status, 'applied');
  assert.equal((await db.getRepository(TrainingProgram).findOneByOrFail({ userId: user.id })).output.result.sessions[0].exercises[0].sets, proposal.change.sets);
  assert.equal((await db.getRepository(CoachProposal).find()).length, 1);
  assert.equal((await db.getRepository(JournalEntry).findBy({ userId: user.id, type: 'coach.program.corrected' })).length, 1);
  assert.equal((await service.decide(user.id, first.id, proposal.id, 'applied')).proposals[0].status, 'applied');
});
test('meal portion proposal changes one meal row, recalculates macros and rejects a stale version', async t => {
  const db = await database(t);
  const user = await db.getRepository(User).save({ appleSubject: 'coach-meal' });
  const mealId = randomUUID(), itemId = randomUUID();
  await db.getRepository(NutritionMeal).save({ id: mealId, userId: user.id, date: '2026-09-23', revision: 1, deletedAt: null,
    snapshot: { id: mealId, date: '2026-09-23', moment: 'Midi', time: '12:30', source: 'manual', items: [{ id: itemId, foodId: 'food-1', amount: 100,
      food: { name: 'Riz', baseUnit: 'g', per100: { calories: 130, protein: 3, carbs: 28, fat: 0.4 } } }],
      totals: { calories: 130, protein: 3, carbs: 28, fat: 0.4 } } });
  const ai = { answer: async (_base, _history, _memory, tool) => {
    await tool('get_nutrition', {});
    return { answer: { ...noAction, title: 'Corriger mon repas', reply: 'Je te propose de corriger la portion.', actionType: 'meal_portion',
      targetId: `${mealId}:${itemId}`, amount: 150 }, trace: { model: 'mock' } };
  } };
  const service = new CoachService(db, ai, { sevenDayJournal: async () => [], coachMemory: async () => ({ messages: [] }) });
  const first = await service.send(user.id, null, randomUUID(), 'Mets le riz à 150 g', '2026-09-23');
  assert.equal((await db.getRepository(NutritionMeal).findOneByOrFail({ id: mealId })).snapshot.items[0].amount, 100);
  await service.decide(user.id, first.id, first.proposals[0].id, 'applied');
  const corrected = await db.getRepository(NutritionMeal).findOneByOrFail({ id: mealId });
  assert.equal(corrected.revision, 2);
  assert.equal(corrected.snapshot.items[0].amount, 150);
  assert.equal(corrected.snapshot.totals.calories, 195);
  assert.equal((await db.getRepository(JournalEntry).findBy({ userId: user.id, type: 'coach.meal.corrected' })).length, 1);
  const next = await service.send(user.id, first.id, randomUUID(), 'Finalement 150 g ?', '2026-09-23');
  assert.equal(next.proposals.length, 1); // unchanged amount is not a proposal
  ai.answer = async (_base, _history, _memory, tool) => { await tool('get_nutrition', {}); return { answer: { ...noAction, actionType: 'meal_portion', targetId: `${mealId}:${itemId}`, amount: 200 }, trace: {} }; };
  const third = await service.send(user.id, first.id, randomUUID(), 'Passe à 200 g', '2026-09-23');
  const pending = third.proposals.find(p => p.status === 'pending');
  await db.getRepository(NutritionMeal).update({ id: mealId }, { revision: 3 });
  await assert.rejects(service.decide(user.id, first.id, pending.id, 'applied'), { status: 409 });
});
