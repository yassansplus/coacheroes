require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { DataSource } = require('typeorm');
const { ConfigService } = require('@nestjs/config');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User, Onboarding, JournalEntry } = require('../dist/database/entities');
const { ProgramBlock, WorkoutSession } = require('../dist/workouts/workout.entity');
const { TrainingProgram } = require('../dist/program/program.entity');
const { ProgramService } = require('../dist/program/program.service');
const { ProgramGenerator } = require('../dist/program/generator');
const { ProgramReviewService } = require('../dist/chat/program-review.service');
const { WorkoutService } = require('../dist/workouts/workout.service');
const { ChatConversation } = require('../dist/chat/chat.entity');
const { buildTrainingContext } = require('../dist/program/context');
const { renewalRequestSchema } = require('../dist/program/renewal.schema');
const { summarizeWorkout } = require('../dist/workouts/workout.schema');
const { profile, plan } = require('./program-fixtures.cjs');
const { snapshot } = require('./workout-fixtures.cjs');

const migrationNames = [
  ['1791900000000-DutchLanguage','DutchLanguage1791900000000'],['1791800000000-UserLanguage','UserLanguage1791800000000'],
  ['1790000000000-IdentityAndOnboarding', 'IdentityAndOnboarding1790000000000'],
  ['1790100000000-TrainingPrograms', 'TrainingPrograms1790100000000'],
  ['1790200000000-CoachingChat', 'CoachingChat1790200000000'],
  ['1790300000000-ProgramAcceptance', 'ProgramAcceptance1790300000000'],
  ['1790400000000-AllowJournalDeletion', 'AllowJournalDeletion1790400000000'],
  ['1790500000000-WorkoutHistory', 'WorkoutHistory1790500000000'],
  ['1790600000000-DailyCheckIns', 'DailyCheckIns1790600000000'],
  ['1790700000000-Nutrition', 'Nutrition1790700000000'],
  ['1790800000000-NutritionCoachOpinions', 'NutritionCoachOpinions1790800000000'],
  ['1791100000000-ProgramRenewal', 'ProgramRenewal1791100000000'],
  ['1791200000000-Progression', 'Progression1791200000000'],
];
const migrations = migrationNames.map(([file, name]) => require(`../dist/database/migrations/${file}`)[name]);

test('renewal analysis uses the program model and redacts names and emails', async () => {
  const initial = profile(); const context = buildTrainingContext(initial, 1, 'Max');
  context.previousProgram = plan(); context.blockSummary = { completed: 2, planned: 4 };
  context.trainingHistory = [{ debrief: { comment: 'Max a écrit à max@example.test' } }];
  context.renewalAnswers = { feedback: 'Max préfère continuer.' };
  const result = { progress: 'Quelques séries réalisées.', adherence: 'Deux séances sur quatre.', recovery: 'Non renseignée.', weight: 'Non renseigné.',
    keep: ['Séances simples'], adjust: ['Rythme plus régulier'], cautions: [] };
  let request;
  const original = global.fetch;
  global.fetch = async (_url, options) => { request = JSON.parse(options.body);
    return new Response(JSON.stringify({ id: 'analysis-test', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }), { status: 200 }); };
  try {
    const generator = new ProgramGenerator(new ConfigService({ OPENAI_API_KEY: 'test-only' }), {});
    const output = await generator.analyzeRenewal(context, AbortSignal.timeout(2000));
    assert.equal(output.analysis.progress, result.progress);
    assert.equal(request.model, 'gpt-5.6-sol'); assert.equal(request.reasoning.effort, 'medium'); assert.equal(request.store, false);
    assert.equal(request.service_tier, undefined);
    assert.ok(!JSON.stringify(request.input).includes('max@example.test'));
    assert.ok(!JSON.stringify(request.input).includes('Max'));
  } finally { global.fetch = original; }
});

test('a completed block keeps its logs, records updated answers, analyzes progression and opens a separate next block', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations,
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const user = await db.getRepository(User).save({ appleSubject: 'renewal-user', firstName: 'Max' });
  const initial = profile(); initial.photos = {};
  await db.getRepository(Onboarding).save({ userId: user.id, profile: initial, currentStep: 14, revision: 1, completedAt: new Date() });
  const oldId = randomUUID(), acceptedAt = new Date(Date.now() - 32 * 86400000);
  const context = buildTrainingContext(initial, 1, 'Max');
  const oldOutput = { result: plan(), exercises: [], trace: {} };
  await db.getRepository(TrainingProgram).save({ userId: user.id, runId: oldId, sourceRevision: 1, status: 'ready', phase: 'validating',
    attempts: 0, leaseUntil: null, context, output: oldOutput, acceptedAt, error: null });
  await db.getRepository(ProgramBlock).save({ id: oldId, userId: user.id, prescription: { context, output: oldOutput },
    startedAt: acceptedAt, endsAt: new Date(Date.now() - 4 * 86400000), extensions: 0, renewalReview: null });
  const logged = snapshot(); logged.workout.programVersionId = oldId; logged.workout.sessionIndex = 0; logged.workout.week = 2;
  logged.startedAt = Date.now() - 18 * 86400000; logged.endedAt = logged.startedAt + 2700000; logged.status = 'completed';
  logged.exercises[0].sets[0] = { id: randomUUID(), occurredAt: new Date(logged.startedAt + 1000).toISOString(), updatedAt: new Date(logged.startedAt + 1000).toISOString(),
    weight: 20, reps: 10, feeling: 'correct', warmup: false };
  await db.getRepository(WorkoutSession).save({ id: randomUUID(), userId: user.id, programVersionId: oldId, revision: 1,
    status: 'completed', startedAt: new Date(logged.startedAt), endedAt: new Date(logged.endedAt), snapshot: logged,
    summary: summarizeWorkout(logged), analysis: null, analysisAppliedAt: null });
  const stopped = structuredClone(logged); stopped.workout.week = 3; stopped.startedAt = Date.now() - 11 * 86400000;
  stopped.endedAt = stopped.startedAt + 600000; stopped.status = 'abandoned'; stopped.debrief.pain = true;
  stopped.exercises[0].sets = [null, null];
  await db.getRepository(WorkoutSession).save({ id: randomUUID(), userId: user.id, programVersionId: oldId, revision: 1,
    status: 'abandoned', startedAt: new Date(stopped.startedAt), endedAt: new Date(stopped.endedAt), snapshot: stopped,
    summary: summarizeWorkout(stopped), analysis: null, analysisAppliedAt: null });
  for (const [days, kg] of [[25, 76], [5, 75]]) await db.query(`INSERT INTO daily_check_ins(user_id,date,timezone,completed_at,data) VALUES($1,$2,'Europe/Paris',now(),$3)`,
    [user.id, new Date(Date.now() - days * 86400000).toISOString().slice(0, 10), JSON.stringify({ weightKg: kg, energy: 3, sleepMinutes: 420 })]);
  const analyzed = { progress: 'Une séance enregistrée.', adherence: 'Une séance sur quatre prévues.', recovery: 'Données limitées.', weight: 'Deux pesées.', keep: ['Exercices simples'], adjust: ['Garder un rythme accessible'], cautions: [] };
  const calls = [];
  const generator = { ensureConfigured() {}, settings: () => ({ model: 'gpt-5.6-sol', reasoningEffort: 'medium' }),
    analyzeRenewal: async input => { calls.push({ type: 'analysis', input }); return { analysis: analyzed, trace: { model: 'gpt-5.6-sol' } }; },
    generate: async input => { calls.push({ type: 'generate', input }); return { result: { ...plan(), title: 'Suite du programme' }, exercises: [], trace: {} }; } };
  const service = new ProgramService(db, generator);
  const workoutService = new WorkoutService(db, {});
  await workoutService.extend(user.id, oldId);
  assert.equal((await db.getRepository(ProgramBlock).findOneByOrFail({ id: oldId })).extensions, 2);
  await db.getRepository(ProgramBlock).update(oldId, { endsAt: new Date(Date.now() - 4 * 86400000), extensions: 0 });
  const review = await service.block(user.id, oldId);
  assert.equal(review.summary.completed, 1); assert.equal(review.summary.planned, 4);
  assert.equal(review.summary.abandoned, 1); assert.equal(review.summary.painSessions, 1);
  assert.equal(review.summary.weight.first.kg, 76); assert.equal(review.summary.weight.last.kg, 75);
  const requestId = randomUUID();
  const answers = { ...review.answers, goals: ['recomposition'], weightKg: 75, effort: 'balanced', feedback: 'Garde les mouvements simples.' };
  const pending = await service.renew(user.id, { blockId: oldId, profileRevision: review.profileRevision, requestId, answers });
  assert.equal(pending.status, 'queued'); assert.equal(pending.previousBlockId, oldId);
  assert.equal((await db.getRepository(Onboarding).findOneByOrFail({ userId: user.id })).revision, 2);
  assert.equal((await db.getRepository(ProgramBlock).findOneByOrFail({ id: oldId })).renewalReview.answers.weightKg, 75);
  await assert.rejects(workoutService.extend(user.id, oldId), { status: 409 });
  assert.equal((await service.renew(user.id, { blockId: oldId, profileRevision: review.profileRevision, requestId, answers })).proposalId, pending.proposalId);
  await service.tick();
  const proposed = await service.get(user.id);
  assert.equal(proposed.status, 'ready'); assert.equal(calls[0].input.trainingHistory.length, 2);
  assert.equal(calls[0].input.trainingHistory[1].status, 'abandoned');
  assert.equal(calls[1].input.renewalAnalysis.progress, analyzed.progress);
  assert.equal((await db.getRepository(ProgramBlock).findOneByOrFail({ id: oldId })).renewalReview.analysis.analysis.progress, analyzed.progress);
  await db.getRepository(ChatConversation).save({ userId: user.id, purpose: 'program_review', programRunId: oldId,
    sourceRevision: 1, status: 'awaiting_answer', question: null, pendingMessageId: null, turnId: null, leaseUntil: null, attempts: 0, error: null });
  const reviewChat = new ProgramReviewService(db, {}, generator);
  const newConversation = await reviewChat.open(user.id);
  assert.equal(newConversation.proposalId, proposed.proposalId);
  assert.equal(await db.getRepository(ChatConversation).countBy({ userId: user.id, purpose: 'program_review' }), 2);
  await service.accept(user.id, proposed.proposalId);
  assert.equal(await db.getRepository(ProgramBlock).countBy({ userId: user.id }), 2);
  assert.equal(await db.getRepository(WorkoutSession).countBy({ userId: user.id, programVersionId: oldId }), 2);
  assert.equal((await service.history(user.id)).length, 2);
  assert.equal(await db.getRepository(JournalEntry).countBy({ userId: user.id, type: 'program.renewal_requested' }), 1);
});

test('explicit regeneration before the end preserves the previous block and refuses an ongoing workout', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities, migrations,
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const user = await db.getRepository(User).save({ appleSubject: 'regeneration-user', firstName: 'Max' });
  const initial = profile(); initial.photos = {};
  await db.getRepository(Onboarding).save({ userId: user.id, profile: initial, currentStep: 14, revision: 1, completedAt: new Date() });
  const blockId = randomUUID(), acceptedAt = new Date(Date.now() - 86400000), endsAt = new Date(Date.now() + 27 * 86400000);
  const context = buildTrainingContext(initial, 1, 'Max'), previous = { result: plan(), exercises: [], trace: {} };
  await db.getRepository(TrainingProgram).save({ userId: user.id, runId: blockId, sourceRevision: 1, status: 'ready', phase: 'validating',
    attempts: 0, leaseUntil: null, context, output: previous, acceptedAt, error: null });
  await db.getRepository(ProgramBlock).save({ id: blockId, userId: user.id, prescription: { context, output: previous },
    startedAt: acceptedAt, endsAt, extensions: 0, renewalReview: null });
  const generator = { ensureConfigured() {}, settings: () => ({}),
    analyzeRenewal: async input => { assert.equal(input.regeneration, true); assert.equal(input.blockSummary.replaced, true);
      assert.equal(input.blockSummary.completed, 0); return { analysis: {}, trace: {} }; },
    generate: async input => { assert.equal(input.regeneration, true); return { ...previous, result: { ...plan(), title: 'Nouveau programme' } }; } };
  const service = new ProgramService(db, generator);
  const review = await service.block(user.id, blockId);
  assert.equal(review.summary.due, false);
  const request = { blockId, profileRevision: review.profileRevision, requestId: randomUUID(), answers: review.answers };
  await assert.rejects(service.renew(user.id, request), { status: 409 });
  const confirmed = renewalRequestSchema.parse({ ...request, regenerate: true });
  const logged = snapshot(); logged.workout.programVersionId = blockId; logged.status = 'in_progress';
  logged.startedAt = Date.now() - 60000; logged.endedAt = null;
  const workoutId = randomUUID();
  await db.getRepository(WorkoutSession).save({ id: workoutId, userId: user.id, programVersionId: blockId, revision: 1,
    status: 'in_progress', startedAt: new Date(logged.startedAt), endedAt: null, snapshot: logged,
    summary: summarizeWorkout(logged), analysis: null, analysisAppliedAt: null });
  await assert.rejects(service.renew(user.id, confirmed), /séance en cours/);
  assert.equal((await db.getRepository(ProgramBlock).findOneByOrFail({ id: blockId })).endsAt.toISOString(), endsAt.toISOString());
  logged.status = 'abandoned'; logged.endedAt = Date.now();
  await db.getRepository(WorkoutSession).update(workoutId, { status: 'abandoned', endedAt: new Date(logged.endedAt), snapshot: logged, summary: summarizeWorkout(logged) });
  const pending = await service.renew(user.id, confirmed);
  assert.equal(pending.status, 'queued'); assert.equal(pending.previousBlockId, blockId);
  assert.equal((await service.renew(user.id, confirmed)).proposalId, pending.proposalId);
  const archived = await db.getRepository(ProgramBlock).findOneByOrFail({ id: blockId });
  assert.ok(archived.endsAt.getTime() <= Date.now()); assert.ok(archived.endsAt.getTime() < endsAt.getTime());
  assert.equal(archived.renewalReview.replacement.plannedEndsAt, endsAt.toISOString());
  assert.deepEqual(archived.prescription.output, previous);
  const finished = await service.block(user.id, blockId);
  assert.equal(finished.summary.due, true); assert.equal(finished.summary.replaced, true);
  assert.equal(finished.summary.completed, 0); assert.equal(finished.summary.planned, 4);
  const journal = await db.getRepository(JournalEntry).findOneByOrFail({ requestId: request.requestId });
  assert.equal(journal.payload.regeneration, true);
  assert.equal(journal.payload.block.before.endsAt, endsAt.toISOString());
  await service.tick();
  const proposal = await service.get(user.id);
  assert.equal(proposal.status, 'ready'); assert.equal(proposal.acceptedAt, null);
  await service.accept(user.id, proposal.proposalId);
  assert.equal(await db.getRepository(ProgramBlock).countBy({ userId: user.id }), 2);
  assert.equal(await db.getRepository(WorkoutSession).countBy({ userId: user.id, programVersionId: blockId }), 1);
  const archivedItem = (await service.history(user.id)).find(item => item.id === blockId);
  assert.equal(archivedItem.status, 'completed'); assert.equal(archivedItem.replaced, true);
});
