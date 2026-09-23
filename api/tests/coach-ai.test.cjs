require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { CoachAi } = require('../dist/coach/coach-ai');

test('coach accepts a complete detailed answer beyond the old 800-character ceiling', async () => {
  const answer = { title: 'Comprendre ma séance', reply: 'On regarde ça ensemble. '.repeat(55), actionType: 'none',
    targetId: '', sessionIndex: 0, exerciseIndex: 0, sets: 0, rir: 0, amount: 0, reason: '' };
  const original = global.fetch;
  let request;
  global.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return { ok: true, json: async () => ({ id: 'response-1', status: 'completed',
      output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] }) };
  };
  try {
    const result = await new CoachAi(new ConfigService({ OPENAI_API_KEY: 'test-only' })).answer({}, [{ role: 'user', text: 'Explique-moi en détail.' }], [], async () => { throw new Error('unused'); });
    assert.equal(result.answer.reply, answer.reply);
    assert.ok(result.answer.reply.length > 800);
    assert.equal(request.max_output_tokens, 12000);
    assert.match(request.instructions, /jeune coach sympa/);
    assert.match(request.instructions, /réponds complètement/i);
  } finally { global.fetch = original; }
});
