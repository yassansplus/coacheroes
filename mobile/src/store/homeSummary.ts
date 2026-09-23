import { useSyncExternalStore } from 'react';

/** Session-only summaries published by the existing frontend flows. */
let summary: { calories: number; protein: number; calorieGoal: number | null; proteinGoal: number | null; sleepMinutes: number; energy: number; checkedIn: boolean } =
  { calories: 0, protein: 0, calorieGoal: null, proteinGoal: null, sleepMinutes: 380, energy: 3, checkedIn: false };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => summary;
export function updateHomeSummary(patch: Partial<typeof summary>) {
  if (Object.entries(patch).every(([key, value]) => summary[key as keyof typeof summary] === value)) return;
  summary = { ...summary, ...patch };
  listeners.forEach(listener => listener());
}
export const useHomeSummary = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
export function resetHomeNutritionSummary() { updateHomeSummary({ calories: 0, protein: 0, calorieGoal: null, proteinGoal: null }); }
