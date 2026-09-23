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

test('generated sessions preserve server prescriptions, Monday indexing and never invent previous performances', () => {
  const { generatedWorkout } = require('../src/features/program/generatedAdapter.ts');
  const program = { status: 'ready', stale: false, sourceRevision: 5,
    result: { summary: 'Programme personnalisé', sessions: [{ name: 'Séance A', weekday: 0, estimatedMinutes: 45, warmupMinutes: 8, warmup: 'Préparation progressive',
      exercises: [{ exerciseId: 42, sets: 3, minReps: 8, maxReps: 12, restSeconds: 120, rir: 3, guidance: 'Calibrer', progression: 'Progression conditionnelle' }] }] },
    exercises: [{ id: 42, name: 'Exercice réel', muscles: [{ id: 4, name: 'Pectoraux' }], equipment: [{ id: 3, name: 'Haltères' }] }] };
  const workout = generatedWorkout(program, 0);
  assert.equal(workout.name, 'Musculation'); assert.equal(workout.description, 'Musculation');
  assert.equal(workout.day, 1); assert.equal(workout.warmupMinutes, 8);
  assert.equal(workout.prescribedExercises[0].name, 'Exercice réel'); assert.equal(workout.prescribedExercises[0].restSeconds, 120);
  assert.equal(workout.prescribedExercises[0].rir, 3); assert.deepEqual(workout.prescribedExercises[0].sets, [null, null, null]);
  assert.deepEqual(workout.prescribedExercises[0].previous, { weight: 0, reps: [] });
  assert.equal(generatedWorkout({ ...program, stale: true }, 0), null);
  assert.equal(generatedWorkout({ ...program, exercises: [] }, 0), null);
});

test('generated boxing preserves timed blocks without inventing strength exercises', () => {
  const { generatedWorkout } = require('../src/features/program/generatedAdapter.ts');
  const blocks = [{ title: 'Technique', minutes: 30, intensity: 'moderate', instruction: 'Suis ton coach.' }];
  const workout = generatedWorkout({ status: 'ready', stale: false, sourceRevision: 2, exercises: [], result: { summary: 'Ta semaine', sessions: [{ sport: 'boxing', name: 'Boxe', weekday: 1, estimatedMinutes: 35, warmupMinutes: 5, warmup: 'Mobilité', exercises: [], blocks }] } }, 0);
  assert.equal(workout.kind, 'free'); assert.deepEqual(workout.sportBlocks, blocks);
  assert.deepEqual(workout.prescribedExercises, []); assert.equal(workout.name, 'Boxe');
});
