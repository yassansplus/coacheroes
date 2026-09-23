const { DailyCheckIns1790600000000 } = require('../dist/database/migrations/1790600000000-DailyCheckIns');
const { Nutrition1790700000000 } = require('../dist/database/migrations/1790700000000-Nutrition');
const { NutritionCoachOpinions1790800000000 } = require('../dist/database/migrations/1790800000000-NutritionCoachOpinions');
const { NutritionCoachContext } = require('../dist/nutrition/nutrition-coach-context');
const { DailyService } = require('../dist/daily/daily.service');
const { DailyController } = require('../dist/daily/daily.controller');
const { NutritionController } = require('../dist/nutrition/nutrition.controller');
const { NutritionService } = require('../dist/nutrition/nutrition.service');
const { NutritionCatalog } = require('../dist/nutrition/nutrition-catalog');
const { NutritionAi } = require('../dist/nutrition/nutrition-ai');
const { WorkoutAi }=require('../dist/workouts/workout-ai');
const { WorkoutController }=require('../dist/workouts/workout.controller');
const { WorkoutService }=require('../dist/workouts/workout.service');
const { snapshot:workoutSnapshot }=require('./workout-fixtures.cjs');
const { WorkoutHistory1790500000000 } = require('../dist/database/migrations/1790500000000-WorkoutHistory');
const { AllowJournalDeletion1790400000000 } = require('../dist/database/migrations/1790400000000-AllowJournalDeletion');
require('reflect-metadata');
const { ProgramAcceptance1790300000000 } = require('../dist/database/migrations/1790300000000-ProgramAcceptance');
const { CoachingChat1790200000000 } = require('../dist/database/migrations/1790200000000-CoachingChat');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { Module, ValidationPipe } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { ConfigService } = require('@nestjs/config');
const { DataSource } = require('typeorm');
const { raw } = require('express');
const { createTestDriver } = require('./pglite-driver.cjs');
const { entities, Onboarding, JournalEntry, Session, AuthChallenge, User } = require('../dist/database/entities');
const { TrainingPrograms1790100000000 } = require('../dist/database/migrations/1790100000000-TrainingPrograms');
const { IdentityAndOnboarding1790000000000 } = require('../dist/database/migrations/1790000000000-IdentityAndOnboarding');
const { AuthService, hash } = require('../dist/auth/auth.service');
const { AuthController } = require('../dist/auth/auth.controller');
const { AuthGuard } = require('../dist/auth/auth.guard');
const { AppleVerifier } = require('../dist/auth/apple-verifier');
const { OnboardingService } = require('../dist/onboarding/onboarding.service');
const { OnboardingController } = require('../dist/onboarding/onboarding.controller');

const { ProgramController } = require('../dist/program/program.controller');
const { ProgramService } = require('../dist/program/program.service');
const { ProgramGenerator } = require('../dist/program/generator');
const { WgerService } = require('../dist/program/wger.service');

const { ChatController } = require('../dist/chat/chat.controller');
const { ChatService } = require('../dist/chat/chat.service');
const { ChatAi } = require('../dist/chat/chat-ai');
const { ProgramReviewController } = require('../dist/chat/program-review.controller');
const { ProgramReviewService } = require('../dist/chat/program-review.service');
const { TrainingProgram } = require('../dist/program/program.entity');
const { buildTrainingContext } = require('../dist/program/context');
const { plan } = require('./program-fixtures.cjs');

const initialProfile = () => ({
  goal: ['recomposition'], age: '28', height: '177', weight: '78,5', gender: 'male', level: 'beginner',
  performances: [{ id: 'pushups', label: 'Pompes', value: null, unit: 'rep.' }], sports: ['strength'], places: ['gym'],
  days: [0, 2, 4], sessions: 3, timeOfDay: 'evening', duration: '60', gymType: 'full', equipment: [],
  painSide: 'right', pains: [], painNotes: '', noPain: true, sleep: 390, activity: 'moderate', steps: 7500,
  meals: '3', cooking: 'often', restaurants: '2-3', tracking: ['none'], likedFoods: [], avoidedFoods: [], allergies: '',
  photos: {}, measurements: { waist: '', chest: '', arms: '', thighs: '' }, skippedSteps: [],
});
const request = (profile, revision, currentStep = 3) => ({ profile, revision, currentStep, requestId: randomUUID(), occurredAt: new Date().toISOString(), timezone: 'Europe/Paris' });

test('Apple identity, sessions, onboarding and history through the HTTP API and TypeORM', async t => {
  const jose = await import('jose');
  const key = await jose.generateKeyPair('RS256');
  const jwk = await jose.exportJWK(key.publicKey);
  const verifier = new AppleVerifier(new ConfigService({ APPLE_CLIENT_ID: 'com.test.app' }));
  verifier.keys = jose.createLocalJWKSet({ keys: [{ ...jwk, kid: 'test', alg: 'RS256' }] });
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities,
    migrations: [IdentityAndOnboarding1790000000000, TrainingPrograms1790100000000, CoachingChat1790200000000, ProgramAcceptance1790300000000, AllowJournalDeletion1790400000000, WorkoutHistory1790500000000, DailyCheckIns1790600000000, Nutrition1790700000000, NutritionCoachOpinions1790800000000], synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize();
  await db.runMigrations();
  // HTTP tests exercise routes only; queue execution is tested explicitly in program.test.cjs.
  // A periodic worker would compete with the single-connection PGlite test driver.
  const programService = new ProgramService(db, new ProgramGenerator(new ConfigService({ OPENAI_API_KEY: '' }), new WgerService()));
  programService.onModuleInit = () => {};
  const chatAi = new ChatAi(new ConfigService({ OPENAI_API_KEY: '' }));
  const chatService = new ChatService(db, chatAi, programService);
  const reviewService = new ProgramReviewService(db, chatAi, new ProgramGenerator(new ConfigService({ OPENAI_API_KEY: '' }), new WgerService()));
  const catalog = new NutritionCatalog(db, new ConfigService());
  const nutritionService = new NutritionService(db, new NutritionAi(new ConfigService({ OPENAI_API_KEY: '' })), catalog, new NutritionCoachContext(db));
  chatService.onModuleInit = () => {}; reviewService.onModuleInit = () => {};
  nutritionService.onModuleInit = () => {};
  class TestModule {}
  Module({ controllers: [NutritionController,DailyController,WorkoutController,AuthController, OnboardingController, ProgramController, ChatController, ProgramReviewController], providers: [{ provide: NutritionService, useValue: nutritionService }, { provide: NutritionCatalog, useValue: catalog }, {provide:WorkoutAi,useValue:{analyze:async()=>{throw new Error('Not called in HTTP tests');}}},WorkoutService,DailyService,AuthGuard, AuthService, OnboardingService,
    { provide: ProgramService, useValue: programService },
    { provide: ChatService, useValue: chatService }, { provide: ProgramReviewService, useValue: reviewService },
    { provide: DataSource, useValue: db }, { provide: AppleVerifier, useValue: verifier }] })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.use('/api/onboarding/photos', raw({ type: 'application/octet-stream', limit: '8mb' }));
  app.use('/api/nutrition/photos', raw({ type: 'application/octet-stream', limit: '8mb' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  t.after(async () => { await app.close(); await db.destroy(); });
  const url = await app.getUrl();
  async function call(path, { token, method = 'GET', body, binary } = {}) {
    const response = await fetch(`${url}/api${path}`, { method, headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': binary ? 'application/octet-stream' : 'application/json',
    }, ...(body === undefined ? {} : { body: binary ? body : JSON.stringify(body) }) });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: response.status, data };
  }
  async function appleToken(nonce, subject = 'apple-user-one', options = {}) {
    return new jose.SignJWT({ nonce, email: 'private@example.test', email_verified: true })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' }).setSubject(subject).setIssuer(options.issuer ?? 'https://appleid.apple.com')
      .setAudience(options.audience ?? 'com.test.app').setIssuedAt().setExpirationTime(options.expiry ?? '5m').sign(key.privateKey);
  }
  async function login(subject = 'apple-user-one') {
    const challenge = await call('/auth/apple/challenge', { method: 'POST' });
    const nonce = challenge.data.nonce;
    const body = { nonce, firstName: 'Max', identityToken: await appleToken(nonce, subject) };
    const result = await call('/auth/apple', { method: 'POST', body });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    return { token: result.data.token, loginBody: body };
  }
  await t.test('TypeORM metadata matches the migration without schema drift', async () => {
    const changes = await db.driver.createSchemaBuilder().log();
    assert.deepEqual(changes.upQueries.map(q => q.query), []);
  });
  let account;
  await t.test('rejects unauthenticated access and invalid Apple claims', async () => {
    assert.equal((await call('/onboarding')).status, 401);
    for (const options of [{ audience: 'wrong-app' }, { issuer: 'wrong-issuer' }, { expiry: '0s' }]) {
      const { data: { nonce } } = await call('/auth/apple/challenge', { method: 'POST' });
      assert.equal((await call('/auth/apple', { method: 'POST', body: { nonce, identityToken: await appleToken(nonce, 'user', options) } })).status, 401);
    }
    const { data: { nonce } } = await call('/auth/apple/challenge', { method: 'POST' });
    assert.equal((await call('/auth/apple', { method: 'POST', body: { nonce, identityToken: await appleToken('mismatched-nonce') } })).status, 401);
  });
  await t.test('creates one account and rejects replay of the Apple challenge', async () => {
    account = await login();
    assert.equal((await call('/auth/apple', { method: 'POST', body: account.loginBody })).status, 401);
    await login();
    assert.equal(await db.getRepository(User).count(), 1);
    assert.equal(await db.getRepository(Onboarding).count(), 1);
    assert.equal((await call('/auth/me', account)).data.onboardingCompleted, false);
    assert.equal((await call('/auth/me', account)).data.firstName, 'Max');
    const { data: { nonce: nameNonce } } = await call('/auth/apple/challenge', { method: 'POST' });
    await call('/auth/apple', { method: 'POST', body: { nonce: nameNonce, identityToken: await appleToken(nameNonce, 'apple-user-one') } });
    assert.equal((await call('/auth/me', account)).data.firstName, 'Max');
    assert.equal(await db.getRepository(JournalEntry).countBy({ type: 'profile.first_name_saved' }), 1);
    const session = await db.getRepository(Session).findOneByOrFail({ tokenHash: hash(account.token) });
    assert.notEqual(session.tokenHash, account.token);
  });
  let first;
  await t.test('saves and resumes a draft; duplicate network retries create no extra rows', async () => {
    first = request(initialProfile(), 0);
    const saved = await call('/onboarding', { ...account, method: 'PUT', body: first });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.revision, 1);
    const count = await db.getRepository(JournalEntry).count();
    assert.equal((await call('/onboarding', { ...account, method: 'PUT', body: first })).status, 200);
    assert.equal(await db.getRepository(JournalEntry).count(), count);
    const resumed = await call('/onboarding', account);
    assert.equal(resumed.data.profile.weight, '78,5');
    assert.equal(resumed.data.currentStep, 3);
  });
  await t.test('updates the same business row, retaining the old value in a separate journal', async () => {
    const body = request({ ...initialProfile(), weight: '77' }, 1);
    assert.equal((await call('/onboarding', { ...account, method: 'PUT', body })).status, 200);
    assert.equal(await db.getRepository(Onboarding).count(), 1);
    const journal = await db.getRepository(JournalEntry).findOneByOrFail({ requestId: body.requestId });
    assert.deepEqual(journal.payload.changes.weight, { before: '78,5', after: '77' });
    assert.equal(journal.payload.timezone, 'Europe/Paris');
    assert.ok(journal.recordedAt);
    assert.equal((await call('/onboarding', { ...account, method: 'PUT', body: request(initialProfile(), 1) })).status, 409);
    assert.equal((await call('/onboarding', { ...account, method: 'PUT', body: first })).status, 409);
  });
  await t.test('rejects malformed fields and incomplete completion without modifying the database', async () => {
    for (const profile of [{ ...initialProfile(), photos: { front: 'file:///device.jpg' } }, { ...initialProfile(), days: [0, 0] }, { ...initialProfile(), unexpected: true }]) {
      assert.equal((await call('/onboarding', { ...account, method: 'PUT', body: request(profile, 2) })).status, 400);
    }
    const incomplete = request({ ...initialProfile(), age: '' }, 2, 14);
    assert.equal((await call('/onboarding/complete', { ...account, method: 'POST', body: incomplete })).status, 400);
    assert.equal((await call('/onboarding', account)).data.revision, 2);
  });
  let other;
  let photoId;
  await t.test('stores private photos, deduplicates uploads, and enforces account ownership', async () => {
    const content = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aW9sAAAAASUVORK5CYII=', 'base64');
    const upload = await call('/onboarding/photos', { ...account, method: 'POST', body: content, binary: true });
    assert.equal(upload.status, 201, JSON.stringify(upload.data));
    photoId = upload.data.id;
    assert.equal((await call('/onboarding/photos', { ...account, method: 'POST', body: content, binary: true })).data.id, photoId);
    assert.equal((await call(`/onboarding/photos/${photoId}`, account)).status, 200);
    other = await login('apple-user-two');
    assert.equal((await call(`/onboarding/photos/${photoId}`, other)).status, 404);
    assert.equal((await call('/onboarding', { ...other, method: 'PUT', body: request({ ...initialProfile(), photos: { front: photoId } }, 0) })).status, 400);
    assert.equal((await call('/onboarding/photos', { ...account, method: 'POST', body: Buffer.from('<svg>bad</svg>'), binary: true })).status, 400);
  });
  await t.test('nutrition HTTP routes scope foods and meals to the signed-in account', async () => {
    assert.equal((await call('/nutrition')).status, 401);
    const food = await call('/nutrition/foods/manual', { ...account, method: 'POST', body: { name: 'Aliment témoin', per100: { calories: 110, protein: 8, carbs: 12, fat: 3 }, baseUnit: 'g', portion: 100 } });
    assert.equal(food.status, 201, JSON.stringify(food.data));
    const mealId = randomUUID();
    const write = { id: mealId, requestId: randomUUID(), revision: 0, date: '2026-09-22', moment: 'Midi', time: '12:30', source: 'manual', description: '', items: [{ id: randomUUID(), foodId: food.data.id, amount: 150 }] };
    const saved = await call('/nutrition/meals', { ...account, method: 'PUT', body: write });
    assert.equal(saved.status, 200, JSON.stringify(saved.data));
    assert.equal(saved.data.totals.calories, 165);
    assert.equal((await call('/nutrition/meals', { ...account, method: 'PUT', body: write })).data.revision, 1);
    assert.equal((await call('/nutrition', other)).data.meals.length, 0);
    assert.equal((await call('/nutrition/meals', { ...other, method: 'PUT', body: { ...write, requestId: randomUUID() } })).status, 400);
    assert.equal((await call(`/nutrition/meals/${mealId}`, { ...account, method: 'DELETE' })).status, 200);
    assert.equal((await call('/nutrition', account)).data.meals.length, 0);
  });
  await t.test('completes once and preserves completion when the user later edits a response', async () => {
    const body = request({ ...initialProfile(), photos: { front: photoId } }, 2, 14);
    const completed = await call('/onboarding/complete', { ...account, method: 'POST', body });
    assert.equal(completed.status, 201, JSON.stringify(completed.data));
    assert.ok(completed.data.completedAt);
    assert.equal((await call('/onboarding/complete', { ...account, method: 'POST', body })).status, 201);
    assert.equal((await call('/auth/me', account)).data.onboardingCompleted, true);
    const edited = await call('/onboarding', { ...account, method: 'PUT', body: request({ ...initialProfile(), age: '29' }, 3, 14) });
    assert.equal(edited.status, 200, JSON.stringify(edited.data));
    assert.equal(edited.data.completedAt, completed.data.completedAt);
    assert.equal(await db.getRepository(JournalEntry).countBy({ type: 'onboarding.completed' }), 1);
  });
  await t.test('program routes enforce authentication, ownership and missing-key failures', async () => {
    assert.equal((await call('/program')).status, 401);
    assert.equal((await call('/program/generate', { method: 'POST', body: {} })).status, 401);
    assert.equal((await call('/program', account)).data.program, null);
    assert.equal((await call('/program/generate', { ...account, method: 'POST', body: { userId: 'other' } })).status, 400);
    assert.equal((await call('/program/generate', { ...account, method: 'POST', body: {} })).status, 503);
    assert.equal((await call('/program/generate', { ...other, method: 'POST', body: {} })).status, 409);
  });
  await t.test('review and acceptance HTTP routes validate input, ownership and the exact proposal', async () => {
    assert.equal((await call('/program-review', { method: 'POST' })).status, 401);
    assert.equal((await call('/program/accept', { method: 'POST', body: { proposalId: randomUUID() } })).status, 401);
    assert.equal((await call('/program/accept', { ...account, method: 'POST', body: {} })).status, 400);
    const user = (await call('/auth/me', account)).data;
    const saved = await db.getRepository(Onboarding).findOneByOrFail({ userId: user.id });
    const proposalId = randomUUID();
    await db.getRepository(TrainingProgram).save({ userId: user.id, sourceRevision: saved.revision, status: 'ready', phase: 'validating', runId: proposalId,
      context: buildTrainingContext(saved.profile, saved.revision, user.firstName), output: { result: plan(), exercises: [], trace: {} } });
    const opened = await call('/program-review', { ...account, method: 'POST' });
    assert.equal(opened.status, 201); assert.equal(opened.data.proposalId, proposalId);
    assert.equal((await call(`/chat/${opened.data.id}`, other)).status, 404);
    assert.equal((await call(`/program-review/${opened.data.id}/messages`, { ...account, method: 'POST', body: { text: 'Bonjour' } })).status, 400);
    assert.equal((await call(`/program-review/${opened.data.id}/messages`, { ...account, method: 'POST', body: { requestId: randomUUID(), proposalId, text: 'Pourquoi ?' } })).status, 503);
    assert.equal((await call('/program/accept', { ...account, method: 'POST', body: { proposalId: randomUUID() } })).status, 409);
    const accepted = await call('/program/accept', { ...account, method: 'POST', body: { proposalId } });
    assert.equal(accepted.status, 201); assert.ok(accepted.data.acceptedAt);
    assert.equal((await call('/program', account)).data.program.acceptedAt, accepted.data.acceptedAt);
  });
  await t.test('the journal cannot be rewritten, and rejected audit writes roll back profile changes', async () => {
    await assert.rejects(db.query("UPDATE journal_entries SET type = 'changed'"), /cannot be updated/);
    const user = (await call('/auth/me', account)).data;
    const beforeDeletion = (await call('/onboarding', account)).data;
    const entryId = randomUUID();
    await db.query(`INSERT INTO journal_entries (id, user_id, type, request_id, occurred_at, payload)
      VALUES ($1, $2, 'test.deletable', $3, now(), '{}')`, [entryId, user.id, randomUUID()]);
    await db.query('DELETE FROM journal_entries WHERE id = $1', [entryId]);
    assert.deepEqual(await db.query('SELECT id FROM journal_entries WHERE id = $1', [entryId]), []);
    assert.deepEqual((await call('/onboarding', account)).data, beforeDeletion);
    const body = request({ ...initialProfile(), weight: '76' }, 4, 14);
    await db.query(`CREATE FUNCTION fail_test_journal() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.request_id = '${body.requestId}'::uuid THEN RAISE EXCEPTION 'simulated audit failure'; END IF; RETURN NEW; END; $$;
      CREATE TRIGGER test_audit_failure BEFORE INSERT ON journal_entries FOR EACH ROW EXECUTE FUNCTION fail_test_journal();`);
    const before = (await call('/onboarding', account)).data;
    assert.equal((await call('/onboarding', { ...account, method: 'PUT', body })).status, 500);
    const after = (await call('/onboarding', account)).data;
    assert.equal(after.revision, before.revision);
    assert.deepEqual(after.profile, before.profile);
    await db.query('DROP TRIGGER test_audit_failure ON journal_entries; DROP FUNCTION fail_test_journal();');
  });
  await t.test('two saves from the same revision cannot overwrite each other', async () => {
    const results = await Promise.all(['75', '74'].map(weight => call('/onboarding', { ...account, method: 'PUT', body: request({ ...initialProfile(), weight }, 4, 14) })));
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
    assert.equal((await call('/onboarding', account)).data.revision, 5);
  });
  await t.test('workout routes persist snapshots and reject unauthenticated or cross-account access',async()=>{
    const id=randomUUID(),body={requestId:randomUUID(),revision:0,snapshot:workoutSnapshot()};
    assert.equal((await call('/workouts')).status,401);
    assert.equal((await call(`/workouts/${id}`,{...account,method:'PUT',body:{}})).status,400);
    const saved=await call(`/workouts/${id}`,{...account,method:'PUT',body});assert.equal(saved.status,200);assert.equal(saved.data.session.revision,1);
    assert.equal((await call(`/workouts/${id}`,other)).status,404);
    assert.equal((await call(`/workouts/${id}`,{...other,method:'PUT',body})).status,404);
    assert.equal((await call(`/workouts/${id}`,account)).data.snapshot.workout.name,'Musculation');
  });
  await t.test('expired and revoked sessions cannot read or change onboarding', async () => {
    await db.getRepository(Session).update({ tokenHash: hash(other.token) }, { expiresAt: new Date(0) });
    assert.equal((await call('/onboarding', other)).status, 401);
    assert.equal((await call('/auth/logout', { ...account, method: 'POST' })).status, 204);
    assert.equal((await call('/onboarding', account)).status, 401);
    assert.equal(await db.getRepository(Onboarding).count(), 2);
  });
  await t.test('daily HTTP validates input, authenticates ownership and persists completion', async () => {
    assert.equal((await call('/daily?timezone=UTC')).status, 401);
    const first = await login('daily-http-user');
    const second = await login('daily-http-other');
    const status = await call('/daily?timezone=UTC', { token: first.token });
    assert.equal(status.status, 200);
    assert.equal((await call('/daily?timezone=invalid', { token: first.token })).status, 400);
    const body = { date: status.data.date, timezone: 'UTC', revision: 0, requestId: randomUUID(), data: { weightKg: null, weightSkipped: true, sleepMinutes: 420, sleepQuality: 3, energy: 3, soreness: 'none', pains: [] }, adjustment: 'none', proposalId: null };
    assert.equal((await call('/daily', { token: first.token, method: 'PUT', body })).status, 200);
    assert.equal((await call('/daily', { token: first.token, method: 'PUT', body })).status, 200);
    assert.equal((await call('/daily?timezone=UTC', { token: first.token })).data.row.revision, 1);
    assert.equal((await call('/daily?timezone=UTC', { token: second.token })).data.row, null);
    assert.equal((await call('/daily', { token: first.token, method: 'PUT', body: { ...body, data: { ...body.data, energy: 9 } } })).status, 400);
  });

});
