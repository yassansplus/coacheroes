require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ConfigService } = require('@nestjs/config');
const { NutritionAi } = require('../dist/nutrition/nutrition-ai');

const call = (name, id) => ({ type: 'function_call', name, arguments: '{}', call_id: id });
const answer = data => ({ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] });
test('nutrition planner reads both scoped tools before publishing validated targets', async t => {
  const old = global.fetch, requests = [];
  const outputs = [[call('get_nutrition_profile', 'a')], [call('get_training_program', 'b')], [answer({ calories: 2500, protein: 150, carbs: 300, fat: 78, coachNote: 'On part sur une base adaptée à ta semaine.', assumptions: [] })]];
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    return new Response(JSON.stringify({ id: String(requests.length), status: 'completed', output: outputs.shift(), usage: {} }), { status: 200 });
  };
  t.after(() => { global.fetch = old; });
  const ai = new NutritionAi(new ConfigService({ OPENAI_API_KEY: 'test' }));
  const result = await ai.plan({ objective: ['recomposition'] }, { sessions: [{ sport: 'boxing', estimatedMinutes: 60 }] }, { maintenanceCalories: 2500 });
  assert.equal(result.targets.calories, 2500);
  assert.equal(result.trace.model, 'gpt-5.6-sol');
  assert.equal(requests.length, 3);
  assert.equal(requests[0].store, false);
  assert.ok(requests[1].input.some(item => item.type === 'function_call_output' && item.output.includes('recomposition')));
  assert.ok(requests[2].input.some(item => item.type === 'function_call_output' && item.output.includes('boxing')));
  assert.equal(requests[2].text.format.type, 'json_schema');
});
test('generic meal recognition uses Luna and estimates macros without searching a product', async t => {
  const old = global.fetch, requests = [];
  const outputs = [[call('get_nutrition_targets', 'a')], [call('get_food_preferences', 'b')], [answer({ foods: [{ name: 'banane', brand: null, estimatedAmount: 120, unit: 'g', amountIsEstimated: false, preparation: null, confidence: 'medium', needsConfirmation: false, per100: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 }, macroSource: 'estimated', sourceUrl: null }], clarificationQuestion: null })]];
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    return new Response(JSON.stringify({ id: String(requests.length), status: 'completed', output: outputs.shift(), usage: {} }), { status: 200 });
  };
  t.after(() => { global.fetch = old; });
  const ai = new NutritionAi(new ConfigService({ OPENAI_API_KEY: 'test' }));
  const result = await ai.analyze('photo', '120 g de banane', { calories: 2500 }, { objective: ['muscle'] }, { content: Buffer.from('image'), contentType: 'image/jpeg' });
  assert.equal(result.trace.model, 'gpt-6-luna');
  assert.equal(result.analysis.foods[0].estimatedAmount, 120);
  assert.equal(result.analysis.foods[0].amountIsEstimated, false);
  assert.equal(result.analysis.foods[0].per100.calories, 89);
  assert.equal(result.analysis.foods[0].macroSource, 'estimated');
  assert.equal(result.trace.searched, false);
  assert.equal(requests[0].tools.some(tool => tool.type === 'web_search'), false);
  assert.deepEqual(requests[0].include, ['reasoning.encrypted_content']);
  assert.equal(JSON.stringify(requests[0].text.format.schema).includes('"format":"uri"'), false);
  assert.equal(requests[2].tools.some(tool => tool.type === 'web_search'), true);
  assert.match(requests[2].instructions, /Respecte les quantités indiquées/);
  assert.ok(requests[0].input[0].content.some(part => part.type === 'input_image'));
  assert.ok(requests[2].input.some(item => item.type === 'function_call_output' && item.output.includes('muscle')));
});
test('OpenAI 400 exposes only safe error code and parameter for diagnosis', async t => {
  const old = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ error: { code: 'invalid_json_schema', param: 'text.format.schema', message: 'private meal content' } }), { status: 400 });
  t.after(() => { global.fetch = old; });
  const ai = new NutritionAi(new ConfigService({ OPENAI_API_KEY: 'test' }));
  await assert.rejects(ai.analyze('text', 'banane', null, {}), error => {
    assert.match(error.message, /NUTRITION_OPENAI_HTTP_400_invalid_json_schema_text.format.schema/);
    assert.doesNotMatch(error.message, /private meal content/);
    return true;
  });
});
test('branded product keeps web macros only when the source was actually consulted', async t => {
  const old = global.fetch, requests = [];
  const food = { name: 'Whey vanille', brand: 'Marque Test', estimatedAmount: 30, unit: 'g', amountIsEstimated: false,
    preparation: null, confidence: 'high', needsConfirmation: false, per100: { calories: 390, protein: 78, carbs: 7, fat: 6 },
    macroSource: 'web', sourceUrl: 'https://example.com/whey-vanille' };
  const outputs = [[call('get_nutrition_targets', 'a')], [call('get_food_preferences', 'b')],
    [{ type: 'web_search_call', action: { type: 'search', sources: [{ url: food.sourceUrl }] } }, answer({ foods: [food], clarificationQuestion: null })]];
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    return new Response(JSON.stringify({ id: String(requests.length), status: 'completed', output: outputs.shift(), usage: {} }), { status: 200 });
  };
  t.after(() => { global.fetch = old; });
  const ai = new NutritionAi(new ConfigService({ OPENAI_API_KEY: 'test' }));
  const result = await ai.analyze('text', '30 g de Marque Test Whey vanille', null, {});
  assert.equal(result.analysis.foods[0].macroSource, 'web');
  assert.equal(result.analysis.foods[0].sourceUrl, food.sourceUrl);
  assert.deepEqual(requests[2].include, ['reasoning.encrypted_content', 'web_search_call.action.sources']);
  assert.match(requests[2].instructions, /marque ET une référence/);
});
test('meal opinion reads the dated journal and paginated coach memory before returning a short note', async t => {
  const old = global.fetch, requests = [];
  const outputs = [[call('get_seven_day_journal', 'a')], [{ ...call('get_coach_memory', 'b'), arguments: JSON.stringify({ offset: 0, limit: 30 }) }],
    [answer({ text: 'Bon apport en protéines. Ajoute un fruit si tu as encore faim.' })]];
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    return new Response(JSON.stringify({ id: String(requests.length), status: 'completed', output: outputs.shift(), usage: {} }), { status: 200 });
  };
  t.after(() => { global.fetch = old; });
  const ai = new NutritionAi(new ConfigService({ OPENAI_API_KEY: 'test' }));
  const result = await ai.opinion({ date: '2026-09-23', foods: [{ name: 'riz' }] }, { calories: 2500 }, {
    sevenDayJournal: async () => [{ date: '2026-09-23', training: [], meals: [{ foods: [{ name: 'riz' }] }] }],
    coachMemory: async (offset, limit) => { assert.equal(offset, 0); assert.equal(limit, 30); return { messages: [{ text: 'Avant, on visait les protéines.' }], nextOffset: null }; },
  });
  assert.equal(result.trace.model, 'gpt-5.6-terra');
  assert.equal(requests.length, 3);
  assert.equal(requests[0].store, false);
  assert.ok(requests[1].input.some(item => item.type === 'function_call_output' && item.output.includes('2026-09-23')));
  assert.ok(requests[2].input.some(item => item.type === 'function_call_output' && item.output.includes('Avant, on visait')));
});
