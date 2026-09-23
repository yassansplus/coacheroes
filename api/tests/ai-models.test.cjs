require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { aiSettings } = require('../dist/config/ai-models');
const { validateEnvironment } = require('../dist/config/environment.validation');

test('context routing ignores the old global model and isolates context overrides', () => {
  const config = new ConfigService({ OPENAI_MODEL: 'gpt-6-astra' });
  assert.deepEqual(aiSettings(config, 'program'), { model: 'gpt-5.6-sol', reasoningEffort: 'high' });
  assert.deepEqual(aiSettings(config, 'review'), { model: 'gpt-5.6-terra', reasoningEffort: 'medium' });
  assert.deepEqual(aiSettings(config, 'onboarding'), { model: 'gpt-5.6-luna', reasoningEffort: 'low' });
  assert.deepEqual(aiSettings(config, 'coachChat'), { model: 'gpt-6-luna', reasoningEffort: 'low' });
  config.set('OPENAI_PROGRAM_MODEL', 'gpt-5.6-terra');
  assert.equal(aiSettings(config, 'program').model, 'gpt-5.6-terra');
  assert.equal(aiSettings(config, 'onboarding').model, 'gpt-5.6-luna');
  config.set('OPENAI_PROGRAM_MODEL', ' ');
  assert.equal(aiSettings(config, 'program').model, 'gpt-5.6-sol');
});

test('Astra and unsupported models are rejected before startup or API calls', () => {
  const database = { DATABASE_HOST: 'test', DATABASE_NAME: 'test', DATABASE_USER: 'test', DATABASE_PASSWORD: 'test' };
  for (const [context, variable] of [['program', 'OPENAI_PROGRAM_MODEL'], ['review', 'OPENAI_REVIEW_MODEL'], ['onboarding', 'OPENAI_ONBOARDING_MODEL']]) {
    for (const model of ['gpt-6-astra', 'unknown-model']) {
      assert.throws(() => aiSettings(new ConfigService({ [variable]: model }), context), new RegExp(variable));
      assert.throws(() => validateEnvironment({ ...database, [variable]: model }), new RegExp(variable));
    }
  }
});
