import type { Exercise, LoggedSet, SetDraft } from './types';

export function nextPending(exercises: Exercise[]) {
  for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex++) {
    const setIndex = exercises[exerciseIndex].sets.findIndex(set => set === null);
    if (setIndex >= 0) return { exerciseIndex, setIndex };
  }
  return null;
}
export function summarize(exercises: Exercise[]) {
  const sets = exercises.flatMap(exercise => exercise.sets.filter((set): set is LoggedSet => set !== null && !set.warmup));
  const complete = exercises.filter(exercise => exercise.sets.length && exercise.sets.every(Boolean)).length;
  return { sets: sets.length, volume: sets.reduce((sum, set) => sum + set.weight * set.reps, 0),
    completedExercises: complete, xp: sets.length * 16,
    records: exercises.filter(exercise => exercise.previous.reps.length > 0 && exercise.sets.some(set => set && !set.warmup &&
      (set.weight > exercise.previous.weight || (set.weight === exercise.previous.weight && set.reps > Math.max(...exercise.previous.reps))))).length };
}
export function saveSet(exercises: Exercise[], draft: SetDraft, nextWeight?: number): Exercise[] {
  const { weight, reps } = draft.value;
  if (!Number.isFinite(weight) || weight < 0 || weight > 500 || !Number.isInteger(reps) || reps < 0 || reps > 100) return exercises;
  return exercises.map(exercise => {
    if (exercise.id !== draft.exerciseId || draft.setIndex < 0 || draft.setIndex >= exercise.sets.length) return exercise;
    // An additional warm-up does not consume a prescribed working set.
    const old = exercise.sets[draft.setIndex];
    const sets = draft.value.warmup && !old
      ? [...exercise.sets.slice(0, draft.setIndex), { ...draft.value }, ...exercise.sets.slice(draft.setIndex)]
      : exercise.sets.map((set, index) => index === draft.setIndex ? { ...draft.value } : set);
    return { ...exercise, sets, weight: nextWeight ?? exercise.weight };
  });
}
export function replaceRemaining(exercises: Exercise[], id: string, replacement: Exercise): Exercise[] {
  return exercises.flatMap(exercise => {
    if (exercise.id !== id) return [exercise];
    const completed = exercise.sets.filter((set): set is LoggedSet => set !== null);
    const remaining = exercise.sets.length - completed.length;
    if (!remaining) return [exercise];
    const next = { ...replacement, sets: Array.from({ length: remaining }, () => null) };
    return completed.length ? [{ ...exercise, sets: completed }, next] : [next];
  });
}
export function proposedWeight(weight: number) { return Math.max(0, Math.round(weight * 0.9 / 2.5) * 2.5); }
export function clockLabel(seconds: number) { return `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, Math.floor(seconds)) % 60).padStart(2, '0')}`; }
/** Applies a prescription to a future workout without mutating its source plan. */
export function withSetCounts<T extends { id: string; sets: (unknown | null)[] }>(exercises: T[], counts: Record<string, number>): T[] {
  return exercises.filter(item => counts[item.id] !== 0).map(item => counts[item.id] === undefined ? item : { ...item, sets: Array.from({ length: counts[item.id] }, () => null) });
}
