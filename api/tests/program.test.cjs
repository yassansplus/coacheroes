const { DutchLanguage1791900000000 } = require('../dist/database/migrations/1791900000000-DutchLanguage');
const { UserLanguage1791800000000 } = require('../dist/database/migrations/1791800000000-UserLanguage');
const { WorkoutHistory1790500000000 } = require('../dist/database/migrations/1790500000000-WorkoutHistory');
const { DailyCheckIns1790600000000 } = require('../dist/database/migrations/1790600000000-DailyCheckIns');
const { Nutrition1790700000000 } = require('../dist/database/migrations/1790700000000-Nutrition');
const { NutritionCoachOpinions1790800000000 } = require('../dist/database/migrations/1790800000000-NutritionCoachOpinions');
const { ProgramRenewal1791100000000 } = require('../dist/database/migrations/1791100000000-ProgramRenewal');
const { Progression1791200000000 } = require('../dist/database/migrations/1791200000000-Progression');
const { CoachConversations1790900000000 } = require('../dist/database/migrations/1790900000000-CoachConversations');
const { CoachTablePrivileges1791000000000 } = require('../dist/database/migrations/1791000000000-CoachTablePrivileges');
const { AllowJournalDeletion1790400000000 } = require('../dist/database/migrations/1790400000000-AllowJournalDeletion');
require('reflect-metadata');
const { ProgramAcceptance1790300000000 } = require('../dist/database/migrations/1790300000000-ProgramAcceptance');
const { CoachingChat1790200000000 } = require('../dist/database/migrations/1790200000000-CoachingChat');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { DataSource } = require('typeorm');
const { randomUUID } = require('node:crypto');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, User, Onboarding, JournalEntry } = require('../dist/database/entities');
const { TrainingProgram } = require('../dist/program/program.entity');
const { IdentityAndOnboarding1790000000000 } = require('../dist/database/migrations/1790000000000-IdentityAndOnboarding');
const { TrainingPrograms1790100000000 } = require('../dist/database/migrations/1790100000000-TrainingPrograms');
const { buildTrainingContext: buildContext, requiredClarifications, withForcedGeneration } = require('../dist/program/context');
const { ProgramGenerator } = require('../dist/program/generator');
const { ProgramService } = require('../dist/program/program.service');
const { programResultSchema, programJsonSchema, clarification } = require('../dist/program/program.schema');
const { WgerService, normalizeExercise } = require('../dist/program/wger.service');
const { validateProgram } = require('../dist/program/validation');
const buildTrainingContext = (p, r) => buildContext(p, r, 'Max');
const profile = () => ({ goal: ['muscle'], age: '28', height: '178', weight: '76,5', gender: 'male', level: 'beginner',
  performances: [], sports: ['strength'], places: ['home'], days: [0], sessions: 1, timeOfDay: 'evening', duration: '45', gymType: 'home', equipment: ['dumbbells'],
  painSide: 'left', pains: [], painNotes: '', noPain: true, sleep: 420, activity: 'moderate', steps: 7000, meals: '3', cooking: 'often', restaurants: '0-1', tracking: ['none'],
  likedFoods: [], avoidedFoods: [], allergies: '', photos: { front: randomUUID() }, measurements: { waist: '', chest: '', arms: '', thighs: '' }, skippedSteps: [] });
const raw = id => ({ id, uuid: randomUUID(), category: { id: 11, name: 'Chest' }, muscles: [{ id: 4, name: 'Pectorals' }], muscles_secondary: [], equipment: [{ id: 3, name: 'Dumbbell' }],
  license: { id: 2, full_name: 'CC-BY-SA 4', url: 'https://creativecommons.org/licenses/by-sa/4.0/' }, license_author: 'Author',
  images: [{ image: 'https://example.test/private-image.jpg' }], videos: [{ video: 'https://example.test/video' }],
  translations: [{ id: id + 100, name: `Exercise ${id}`, description: '<p>Move carefully</p>', language: 2, license: 2, license_author: 'Translator' }] });
const prescription = id => ({ exerciseId: id, sets: 3, minReps: 8, maxReps: 12, restSeconds: 90, rir: 3, guidance: 'Choisis la charge selon ton effort.', progression: 'Augmente seulement après validation de la plage de répétitions.' });
const plan = () => ({ outcome: 'ready', title: 'Reprise', summary: 'Une séance adaptée à ton matériel.', blockWeeks: 4, questions: [], assumptions: [], progression: 'Ajuster après tes séances.',
  sessions: [{ name: 'Corps entier', sport: 'strength', setting: 'self', blocks: [], weekday: 0, warmupMinutes: 5, warmup: 'Mobilité douce et séries progressives.', estimatedMinutes: 20, exercises: [prescription(1), prescription(2)] }] });
const message = result => ({ id: 'resp-test', status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
const intents = () => ({ needs: [{ movement: 'Pousser', purpose: 'Travailler le haut du corps.', queries: ['Dumbbell press'] },
  { movement: 'Tirer', purpose: 'Equilibrer le haut du corps.', queries: ['Dumbbell row'] }] });
const fakeWger = () => ({ searchByName: async () => [normalizeExercise(raw(1)), normalizeExercise(raw(2))] });
const generator = wger => new ProgramGenerator(new ConfigService({ OPENAI_API_KEY: 'test-only-not-a-real-key' }), wger ?? fakeWger());

// Fetch is stubbed only inside each sequential test; no OpenAI request or credential is required.
async function withResponses(responses, run) {
  const previous = global.fetch, requests = [];
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    requests.push(JSON.parse(options.body));
    const next = responses.shift(); assert.ok(next, 'unexpected extra request');
    return new Response(JSON.stringify(next), { status: 200 });
  };
  try { return await run(requests); } finally { global.fetch = previous; }
}
test('context normalizes units, redacts photos/nutrition, preserves unknowns and equipment constraints', () => {
  const p = profile(); const c = buildTrainingContext(p, 7);
  assert.equal(c.physical.weightKg, 76.5); assert.equal(c.profileRevision, 7);
  assert.ok(!JSON.stringify(c).includes(p.photos.front)); assert.equal(c.photos, undefined);
  assert.deepEqual(c.equipment.allowedEquipmentIds, [7, 3]);
  const skipped = buildTrainingContext({ ...p, skippedSteps: [5, 7, 8, 10] }, 1);
  for (const key of ['availability', 'equipment', 'recovery']) assert.equal(skipped[key], null);
  assert.equal(skipped.experience.performances, null); assert.equal(requiredClarifications(skipped).length, 2);
  assert.equal(requiredClarifications(buildTrainingContext({ ...p, pains: ['left_wrist'] }, 1)).length, 1);
});
test('wger adapter uses only the public endpoint, strips media, filters all equipment and caches', async () => {
  const previous = global.fetch, requests = [];
  global.fetch = async url => { requests.push(String(url)); return new Response(JSON.stringify({ count: 2, next: null, results: [raw(1), { ...raw(2), equipment: [{ id: 3, name: 'Dumbbell' }, { id: 8, name: 'Bench' }] }] })); };
  try {
    const wger = new WgerService(); const args = { categoryId: 11, equipmentId: 3, muscleId: null, offset: 0 };
    const page = await wger.search(args, [3, 7]);
    assert.equal(page.results.length, 1); assert.equal(page.results[0].description, 'Move carefully');
    assert.equal(page.results[0].translation.author, 'Translator');
    assert.ok(!JSON.stringify(page).includes('private-image')); assert.ok(!JSON.stringify(page).includes('videos'));
    await wger.search(args, [3, 7]); assert.equal(requests.length, 1);
    assert.ok(requests[0].startsWith('https://wger.de/api/v2/exerciseinfo/?')); assert.ok(requests[0].includes('category=11'));
  } finally { global.fetch = previous; }
});
test('wger name search ranks matches, filters unavailable equipment and checks another page if needed', async () => {
  const previous = global.fetch, requests = [];
  global.fetch = async url => {
    requests.push(String(url));
    const first = !String(url).includes('offset=20');
    const named = id => ({ ...raw(id), translations: [{ ...raw(id).translations[0], name: id === 1 ? 'Dumbbell row' : 'Dumbbell curl' }] });
    return new Response(JSON.stringify({ count: 3, next: first ? 'https://wger.de/api/v2/exerciseinfo/?offset=20' : null,
      results: first ? [{ ...named(1), equipment: [{ id: 8, name: 'Bench' }] }, named(2)] : [named(1)] }));
  };
  try {
    const found = await new WgerService().searchByName('Dumbbell row', [3, 7]);
    assert.deepEqual(found.map(item => item.id), [1, 2]);
    assert.ok(requests.every(url => url.startsWith('https://wger.de/api/v2/exerciseinfo/?')));
    assert.ok(requests[0].includes('name__search=Dumbbell+row'));
    assert.ok(requests[0].includes('language__code=en'));
    assert.ok(requests[1].includes('offset=20'));
  } finally { global.fetch = previous; }
});
test('schema and semantic checks reject invented IDs, unavailable days, impossible durations and duplicated sessions', () => {
  const c = buildTrainingContext(profile(), 1), catalog = new Map([1, 2].map(id => [id, normalizeExercise(raw(id))]));
  assert.deepEqual(validateProgram(programResultSchema.parse(plan()), c, catalog), []);
  assert.equal(programJsonSchema.additionalProperties, false);
  for (const mutate of [p => p.sessions[0].exercises[0].exerciseId = 99, p => p.sessions[0].weekday = 1,
    p => p.sessions[0].estimatedMinutes = 90, p => p.sessions.push(p.sessions[0]), p => p.sessions[0].exercises[0].minReps = 20]) {
    const p = plan(); mutate(p); assert.ok(validateProgram(p, c, catalog).length);
  }
});
test('exercise intentions precede wger lookup and final program uses only verified catalog IDs', async () => {
  const c = buildTrainingContext(profile(), 1);
  await withResponses([message(intents()), message(plan())], async requests => {
    const phases = []; const output = await generator().generate(c, async phase => phases.push(phase), AbortSignal.timeout(2000));
    assert.equal(output.result.outcome, 'ready'); assert.equal(output.exercises.length, 2);
    assert.equal(requests[0].model, 'gpt-5.6-sol'); assert.equal(requests[0].reasoning.effort, 'medium');
    assert.equal(requests[0].text.format.strict, true); assert.equal(requests[0].store, false);
    assert.equal(requests[0].text.format.name, 'exercise_intents');
    assert.equal(requests[0].text.format.schema.additionalProperties, false);
    assert.equal(requests[1].text.format.name, 'training_program');
    assert.ok(requests.every(request => request.service_tier === 'fast' && request.reasoning.effort === 'medium'));
    assert.ok(requests[1].input.some(i => i.role === 'user' && i.content.includes('exerciseMatches')));
    assert.ok(phases.includes('searching')); assert.ok(phases.includes('validating'));
    assert.equal(output.trace.calls.length, 2);
    assert.equal(output.trace.calls[0].query, 'Dumbbell press');
  });
});
test('a plan without strength sessions does not query wger', async () => {
  const context = buildTrainingContext({ ...profile(), sports: ['boxing'] }, 1);
  const boxing = plan();
  boxing.sessions[0].sport = 'boxing'; boxing.sessions[0].exercises = [];
  boxing.sessions[0].blocks = [{ title: 'Technique', minutes: 15, intensity: 'moderate', instruction: 'Travaille les enchaînements simples.' }];
  await withResponses([message({ needs: [] }), message(boxing)], async () => {
    const wger = { searchByName: async () => { throw new Error('WGER_SHOULD_NOT_BE_CALLED'); } };
    const output = await generator(wger).generate(context, async () => {}, AbortSignal.timeout(2000));
    assert.equal(output.result.outcome, 'ready');
    assert.deepEqual(output.exercises, []);
  });
});
test('one repair fixes invalid references; repeated invalid output fails rather than publishing', async () => {
  const bad = plan(); bad.sessions[0].exercises[0].exerciseId = 999;
  const c = buildTrainingContext(profile(), 1);
  await withResponses([message(intents()), message(bad), message(plan())], async requests => {
    const output = await generator().generate(c, async () => {}, AbortSignal.timeout(2000));
    assert.equal(output.trace.repaired, true); assert.ok(JSON.stringify(requests[2].input).includes('validationErrors'));
  });
  await withResponses([message(intents()), message(bad), message(bad)], async () => {
    await assert.rejects(generator().generate(c, async () => {}, AbortSignal.timeout(2000)), /PROGRAM_VALIDATION_FAILED/);
  });
});
test('refusal, incomplete response and absent catalog matches are explicit failures', async () => {
  const c = buildTrainingContext(profile(), 1);
  for (const response of [{ id: 'x', status: 'incomplete', output: [] }, { id: 'x', status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] }]) {
    await withResponses([response], async () => assert.rejects(generator().generate(c, async () => {}, AbortSignal.timeout(2000)), /OPENAI_/));
  }
  await withResponses([message(intents())], async () => assert.rejects(generator({ searchByName: async () => [] }).generate(c, async () => {}, AbortSignal.timeout(2000)), /WGER_NO_COMPATIBLE_EXERCISES/));
});
test('missing key leaves existing data intact; clarifications do not call OpenAI', async () => {
  const noKey = new ProgramGenerator(new ConfigService({}), fakeWger());
  assert.throws(() => noKey.ensureConfigured(), /configurée/);
  const output = await noKey.generate(buildTrainingContext({ ...profile(), skippedSteps: [7] }, 1), async () => {}, AbortSignal.timeout(2000));
  assert.equal(output.result.outcome, 'needs_clarification'); assert.deepEqual(output.exercises, []);
});
test('forced generation uses cautious defaults and repairs a repeated clarification instead of returning to chat', async () => {
  const missing = withForcedGeneration(buildTrainingContext({ ...profile(), skippedSteps: [7, 8] }, 1));
  assert.equal(missing.availability.sessionsPerWeek, 3);
  assert.deepEqual(missing.equipment.allowedEquipmentIds, [7]);
  assert.equal(missing.forceGeneration, true);
  assert.ok(missing.generationAssumptions.length);
  const pain = withForcedGeneration(buildTrainingContext({ ...profile(), pains: ['left_wrist'], noPain: false }, 1));
  await withResponses([message(intents()), message(clarification(['Quels mouvements te gênent ?'])), message(plan())], async requests => {
    const output = await generator().generate(pain, async () => {}, AbortSignal.timeout(2000));
    assert.equal(output.result.outcome, 'ready');
    assert.equal(output.trace.repaired, true);
    assert.equal(requests[0].reasoning.effort, 'medium');
    assert.match(requests[0].input[0].content, /L’utilisateur choisit de créer son programme maintenant/);
    assert.match(JSON.stringify(requests[2].input), /sans nouvelle question/);
  });
  await withResponses([message(intents()), message(plan())], async requests => {
    const previous = { result: plan(), exercises: [1, 2].map(id => normalizeExercise(raw(id))), trace: {} };
    const output = await generator().generate(pain, async () => {}, AbortSignal.timeout(2000), { request: 'Change le titre.', previous });
    assert.equal(output.result.outcome, 'ready');
    assert.match(requests[0].input[0].content, /Ajuste uniquement la demande explicite/);
  });
});
test('forcing a clarification queues one new run, logs the decision and preserves the accepted proposal', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities,
    migrations: [DutchLanguage1791900000000, UserLanguage1791800000000, IdentityAndOnboarding1790000000000, TrainingPrograms1790100000000, CoachingChat1790200000000,
      ProgramAcceptance1790300000000, AllowJournalDeletion1790400000000, WorkoutHistory1790500000000,
      ProgramRenewal1791100000000],
    synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const user = await db.getRepository(User).save({ appleSubject: 'force-program-test', firstName: 'Max' });
  await db.getRepository(Onboarding).save({ userId: user.id, profile: profile(), currentStep: 14, revision: 1, completedAt: new Date() });
  const fake = { ensureConfigured() {}, settings: () => ({ model: 'test' }),
    generate: async () => ({ result: clarification(['Précise ton objectif.']), exercises: [], trace: {} }) };
  const service = new ProgramService(db, fake);
  await service.start(user.id); await service.tick();
  assert.equal((await service.get(user.id)).status, 'needs_clarification');
  await service.start(user.id, true);
  assert.equal(await db.getRepository(JournalEntry).countBy({ type: 'program.requested' }), 1);
  const forced = await service.start(user.id, true, false, true);
  assert.equal(forced.status, 'queued');
  assert.equal((await db.getRepository(TrainingProgram).findOneByOrFail({ userId: user.id })).context.forceGeneration, true);
  assert.equal(await db.getRepository(JournalEntry).countBy({ type: 'program.requested' }), 2);
  fake.generate = async () => ({ result: plan(), exercises: [], trace: {} });
  await service.tick();
  const ready = await service.get(user.id);
  assert.equal(ready.status, 'ready');
  await service.accept(user.id, ready.proposalId);
  await service.start(user.id, true, false, true);
  assert.equal((await service.get(user.id)).proposalId, ready.proposalId);
  assert.ok((await service.get(user.id)).acceptedAt);
  assert.equal(await db.getRepository(JournalEntry).countBy({ type: 'program.requested' }), 2);
});
test('durable queue serializes requests, retains revisions in journal, recovers leases and fences old workers', async t => {
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities,
    migrations: [DutchLanguage1791900000000, UserLanguage1791800000000, IdentityAndOnboarding1790000000000, TrainingPrograms1790100000000, CoachingChat1790200000000, ProgramAcceptance1790300000000, AllowJournalDeletion1790400000000, WorkoutHistory1790500000000, DailyCheckIns1790600000000, Nutrition1790700000000, NutritionCoachOpinions1790800000000, CoachConversations1790900000000, CoachTablePrivileges1791000000000, ProgramRenewal1791100000000, Progression1791200000000], synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const user = await db.getRepository(User).save({ appleSubject: 'program-test', firstName: 'Max' });
  const other = await db.getRepository(User).save({ appleSubject: 'other' });
  await db.getRepository(Onboarding).save({ userId: user.id, profile: profile(), currentStep: 14, revision: 1, completedAt: new Date() });
  const fake = { ensureConfigured() {}, settings: () => ({ model: 'test' }), generate: async () => ({ result: plan(), exercises: [], trace: {} }) };
  const service = new ProgramService(db, fake);
  await Promise.all([service.start(user.id), service.start(user.id)]);
  assert.equal(await db.getRepository(TrainingProgram).count(), 1);
  assert.equal(await db.getRepository(JournalEntry).countBy({ type: 'program.requested' }), 1);
  assert.equal(await service.get(other.id), null);
  await service.tick(); assert.equal((await service.get(user.id)).status, 'ready');
  const journal = await db.getRepository(JournalEntry).findOneByOrFail({ type: 'program.generated' });
  assert.equal(journal.payload.output.result.title, 'Reprise');
  await db.getRepository(Onboarding).update(user.id, { revision: 2 });
  assert.equal((await service.get(user.id)).stale, true);
  await service.start(user.id); assert.equal(await db.getRepository(TrainingProgram).count(), 1);
  const requests = await db.getRepository(JournalEntry).findBy({ type: 'program.requested' });
  assert.ok(requests.some(j => j.payload.before?.output?.result.title === 'Reprise'));
  await db.getRepository(TrainingProgram).update(user.id, { status: 'generating', leaseUntil: new Date(0) });
  await service.tick(); assert.equal((await service.get(user.id)).status, 'ready');
  await db.getRepository(Onboarding).update(user.id, { revision: 3 }); await service.start(user.id);
  fake.generate = async () => { await db.getRepository(Onboarding).update(user.id, { revision: 4 }); return { result: plan(), exercises: [], trace: {} }; };
  await service.tick(); assert.equal((await service.get(user.id)).status, 'failed'); assert.equal((await service.get(user.id)).result, null);
  fake.generate = async () => { throw new Error('OPENAI_HTTP_429'); };
  await service.start(user.id); await service.tick(); assert.equal((await service.get(user.id)).status, 'failed');
  const count = await db.getRepository(JournalEntry).countBy({ type: 'program.requested' });
  await service.start(user.id); assert.equal(await db.getRepository(JournalEntry).countBy({ type: 'program.requested' }), count);
  await service.start(user.id, true); assert.equal((await service.get(user.id)).status, 'queued');
  const oldClaim = await db.getRepository(TrainingProgram).findOneByOrFail({ userId: user.id });
  await db.getRepository(TrainingProgram).update(user.id, { runId: randomUUID(), status: 'generating' });
  await service.finish(oldClaim, { result: plan(), exercises: [], trace: {} });
  assert.equal((await service.get(user.id)).status, 'generating');
  assert.equal((await db.driver.createSchemaBuilder().log()).upQueries.length, 0);
});

 test('program planning redacts account identity before sending history', async () => {
  const context = buildTrainingContext(profile(), 1);
  context.coachingNotes = ['Max utilise max@example.test'];
  context.trainingHistory = [{ status: 'completed', comment: 'Max : max@example.test', exercises: [] }];
  await withResponses([message(intents()), message(plan())], async requests => {
    await generator().generate(context, async () => {}, AbortSignal.timeout(2000));
    const first = JSON.parse(requests[0].input[0].content);
    assert.equal(first.context.firstName, 'toi');
    assert.ok(!JSON.stringify(first).includes('max@example.test'));
    assert.ok(!JSON.stringify(requests[1].input).includes('max@example.test'));
    assert.equal(context.firstName, 'Max');
  });
});
