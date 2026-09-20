const { test } = require('node:test');
const assert = require('node:assert/strict');
const { evaluateDemoQuestion, weekRange } = require('../src/features/coach/utils.ts');
const { initialCoachSets, lightCoachSets, activeProgramAdjustment } = require('../src/store/programAdjustment.ts');
const { createExercises } = require('../src/features/program/data.ts');
const { withSetCounts } = require('../src/features/program/utils.ts');

test('a nutrition question does not trigger a programme modification', () => {
  assert.equal(evaluateDemoQuestion('Que manger avec 430 kcal ?').recommend, false);
  assert.equal(evaluateDemoQuestion('Combien de protéines me reste-t-il ?').recommend, false);
});
test('an adjustment request emits a proposal, explicit keep request does not', () => {
  assert.equal(evaluateDemoQuestion('Dois-je alléger ma séance ?').recommend, true);
  assert.equal(evaluateDemoQuestion('Je veux garder ma séance').recommend, false);
  assert.equal(evaluateDemoQuestion('Bonjour').recommend, false);
});
test('follow-up reuses a pending proposal rather than emitting a duplicate', () => {
  const conversation = { proposals: [{ id: 'proposal-a', status: 'pending' }] };
  assert.equal(evaluateDemoQuestion('Ajuster Muscu B', conversation).existingProposalId, 'proposal-a');
  assert.equal(evaluateDemoQuestion('Et pour la boxe samedi ?', conversation).recommend, false);
});
test('the prescription is exactly 18→14 sets and 5→2 shoulder sets, without changing loads', () => {
  const source = createExercises('muscu-b');
  const initial = withSetCounts(source, initialCoachSets);
  const adjusted = withSetCounts(source, lightCoachSets);
  assert.equal(initial.reduce((n, item) => n + item.sets.length, 0), 18);
  assert.equal(adjusted.reduce((n, item) => n + item.sets.length, 0), 14);
  assert.equal(initial.filter(item => item.muscle === 'Épaules').reduce((n, item) => n + item.sets.length, 0), 5);
  assert.equal(adjusted.filter(item => item.muscle === 'Épaules').reduce((n, item) => n + item.sets.length, 0), 2);
  assert.ok(!adjusted.some(item => item.id === 'lateral'));
  adjusted.forEach(item => assert.equal(item.weight, source.find(original => original.id === item.id).weight));
  assert.equal(source.length, 8);
});
test('week scope expires next Monday; ongoing scope has no expiry', () => {
  const now = new Date(2026, 8, 20, 18).getTime();
  const { start, end, reset } = weekRange(now);
  assert.equal(start.getDate(), 14); assert.equal(end.getDate(), 20); assert.equal(reset.getDate(), 21);
  const temporary = { expiresAt: reset.getTime() };
  assert.equal(activeProgramAdjustment(temporary, now), temporary);
  assert.equal(activeProgramAdjustment(temporary, reset.getTime()), null);
  const ongoing = { expiresAt: null };
  assert.equal(activeProgramAdjustment(ongoing, reset.getTime() + 30 * 86400000), ongoing);
});
