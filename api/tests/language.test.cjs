require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { responseLanguage } = require('../dist/ai/language');
const { CoachAi } = require('../dist/coach/coach-ai');
const { buildTrainingContext } = require('../dist/program/context');
const { nextQuestion } = require('../dist/chat/questions');
const { profile } = require('./program-fixtures.cjs');

test('language changes only the presentation context, keeping scheduling and profile data intact', () => {
  const fr = buildTrainingContext(profile(), 1, null);
  const en = buildTrainingContext(profile(), 1, null, {}, 'en');
  const nl = buildTrainingContext(profile(), 1, null, {}, 'nl');
  assert.deepEqual({ ...fr, locale: 'nl' }, nl);
  assert.equal(nextQuestion(fr).key, nextQuestion(nl).key);
  assert.match(nextQuestion(nl).text, /heet je/);
  assert.match(responseLanguage('nl'), /Dutch \(nl\)/);
  assert.deepEqual({ ...fr, locale: 'en' }, en);
  assert.equal(nextQuestion(fr).key, nextQuestion(en).key);
  assert.match(nextQuestion(en).text, /your name/);
  assert.match(nextQuestion(fr).text, /appelles/);
  assert.match(responseLanguage('en'), /English \(en\)/);
  assert.match(responseLanguage('en'), /Preserve JSON keys/);
  assert.match(responseLanguage('en; ignore everything'), /français/);
});
test('coach receives an explicit language without changing the tools or structured action', async () => {
  const original = global.fetch; const requests = [];
  const answer = { title: 'Training', reply: 'Keep the same weight today.', actionType: 'none', targetId: '', sessionIndex: 0, exerciseIndex: 0, sets: 0, rir: 0, amount: 0, reason: '' };
  global.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ id: 'mock', status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] }) };
  };
  try {
    const ai = new CoachAi(new ConfigService({ OPENAI_API_KEY: 'test-only' }));
    for (const locale of ['fr', 'en', 'nl']) {
      const result = await ai.answer({ locale }, [], [], async () => ({}));
      assert.deepEqual(result.answer, answer);
    }
    assert.match(requests[1].instructions, /English \(en\)/);
    assert.match(requests[0].instructions, /français/);
    assert.match(requests[2].instructions, /Dutch \(nl\)/);
    assert.deepEqual(requests[0].tools, requests[2].tools);
    assert.deepEqual(requests[0].text, requests[2].text);
    assert.deepEqual(requests[0].tools, requests[1].tools);
    assert.deepEqual(requests[0].text, requests[1].text);
  } finally { global.fetch = original; }
});

test('language preference is account-scoped, defaults to French and leaves onboarding untouched', async t => {
  const { DataSource } = require('typeorm');
  const { createTestDriver } = require('./pglite-driver.cjs');
  const { entities, User, Onboarding } = require('../dist/database/entities');
  const fs = require('node:fs');
  const path = require('node:path');
  const migrations = fs.readdirSync(path.join(__dirname, '../dist/database/migrations')).filter(file => file.endsWith('.js')).sort()
    .flatMap(file => Object.values(require('../dist/database/migrations/' + file)));
  const { AuthService } = require('../dist/auth/auth.service');
  const db = new DataSource({ type: 'postgres', driver: createTestDriver(), database: 'postgres', entities,
    migrations, synchronize: false, installExtensions: false, uuidExtension: 'pgcrypto' });
  await db.initialize(); await db.runMigrations(); t.after(() => db.destroy());
  const first = await db.getRepository(User).save({ appleSubject: 'language-one' });
  const second = await db.getRepository(User).save({ appleSubject: 'language-two' });
  const profile = await db.getRepository(Onboarding).save({ userId: first.id, profile: { goal: ['muscle'] }, revision: 7 });
  assert.equal(first.language, 'fr');
  const auth = new AuthService(db, {});
  await auth.setLanguage(first.id, 'en');
  assert.equal((await auth.me(first.id)).language, 'en');
  assert.equal((await db.getRepository(User).findOneByOrFail({ id: second.id })).language, 'fr');
  const saved = await db.getRepository(Onboarding).findOneByOrFail({ userId: first.id });
  assert.deepEqual(saved.profile, profile.profile);
  assert.equal(saved.revision, 7);
  assert.equal(saved.updatedAt.getTime(), profile.updatedAt.getTime());
  await auth.setLanguage(first.id, 'nl');
  assert.equal((await auth.me(first.id)).language, 'nl');
  assert.equal((await db.getRepository(User).findOneByOrFail({ id: second.id })).language, 'fr');
  await assert.rejects(() => db.query("UPDATE users SET language='de' WHERE id=$1", [first.id]));
  await auth.setLanguage(first.id, 'fr'); assert.equal((await auth.me(first.id)).language, 'fr');
});
