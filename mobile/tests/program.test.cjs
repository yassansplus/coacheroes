const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createExercises, alternatives } = require('../src/features/program/data.ts');
const { nextPending, saveSet, summarize, replaceRemaining, proposedWeight, clockLabel } = require('../src/features/program/utils.ts');
const value = { weight: 60, reps: 8, feeling: 'correct', warmup: false };

test('20 working sets advance across all 8 exercises and finish only at the last set', () => {
  let exercises = createExercises('muscu-a');
  assert.equal(exercises.length, 8);
  for (let i = 0; i < 20; i++) {
    const pending = nextPending(exercises);
    assert.ok(pending);
    exercises = saveSet(exercises, { exerciseId: exercises[pending.exerciseIndex].id, setIndex: pending.setIndex, value });
    assert.equal(summarize(exercises).sets, i + 1);
  }
  assert.equal(nextPending(exercises), null);
  assert.equal(summarize(exercises).volume, 9600);
  assert.equal(summarize(exercises).xp, 320);
});
test('warmups do not consume prescribed work, inflate volume or award XP', () => {
  const original = createExercises('muscu-a');
  const exercises = saveSet(original, { exerciseId: 'bench', setIndex: 0, value: { ...value, warmup: true } });
  assert.equal(original[0].sets.length, 3);
  assert.equal(exercises[0].sets.length, 4);
  assert.equal(exercises[0].sets.filter(set => !set).length, 3);
  assert.deepEqual(nextPending(exercises), { exerciseIndex: 0, setIndex: 1 });
  assert.equal(summarize(exercises).sets, 0);
  assert.equal(summarize(exercises).volume, 0);
  assert.equal(summarize(exercises).xp, 0);
});
test('editing a completed series updates it without appending and changes volume', () => {
  let exercises = saveSet(createExercises('muscu-a'), { exerciseId: 'bench', setIndex: 0, value });
  exercises = saveSet(exercises, { exerciseId: 'bench', setIndex: 0, value: { ...value, reps: 10 } });
  assert.equal(exercises[0].sets.length, 3);
  assert.equal(summarize(exercises).sets, 1);
  assert.equal(summarize(exercises).volume, 600);
});
test('replacing an exercise keeps recorded sets and only transfers remaining work', () => {
  let exercises = saveSet(createExercises('muscu-a'), { exerciseId: 'bench', setIndex: 0, value });
  const replacement = alternatives(exercises[0])[0];
  exercises = replaceRemaining(exercises, 'bench', replacement);
  assert.equal(exercises[0].sets.length, 1);
  assert.deepEqual(exercises[0].sets[0], value);
  assert.equal(exercises[1].id, replacement.id);
  assert.equal(exercises[1].sets.length, 2);
  assert.equal(exercises[1].weight, 0);
  assert.equal(exercises[1].previous.reps.length, 0);
  assert.equal(summarize(exercises).xp, 16);
  assert.deepEqual(nextPending(exercises), { exerciseIndex: 1, setIndex: 0 });
});
test('a replacement before starting retains the total number of exercises', () => {
  const initial = createExercises('muscu-a');
  const updated = replaceRemaining(initial, initial[0].id, alternatives(initial[0])[0]);
  assert.equal(updated.length, 8);
  assert.equal(updated[0].sets.length, 3);
});
test('load adjustments affect only future targets, never logged weight', () => {
  const exercises = saveSet(createExercises('muscu-a'), { exerciseId: 'bench', setIndex: 0, value }, 55);
  assert.equal(exercises[0].weight, 55);
  assert.equal(exercises[0].sets[0].weight, 60);
  assert.equal(proposedWeight(60), 55);
  assert.equal(proposedWeight(0), 0);
});
test('invalid set input leaves data unchanged', () => {
  const exercises = createExercises('muscu-a');
  for (const invalid of [{ weight: -1 }, { weight: Infinity }, { reps: -1 }, { reps: 1.5 }, { reps: 101 }]) {
    assert.equal(saveSet(exercises, { exerciseId: 'bench', setIndex: 0, value: { ...value, ...invalid } }), exercises);
  }
});
test('free workouts have no strength sets and timers clamp zero', () => {
  assert.deepEqual(createExercises('boxe-a'), []);
  assert.equal(clockLabel(125), '02:05');
  assert.equal(clockLabel(-1), '00:00');
});
