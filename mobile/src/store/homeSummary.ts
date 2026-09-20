import { useSyncExternalStore } from 'react';

/** Session-only summaries published by the existing frontend flows. */
let summary = { calories: 1420, protein: 98, sleepMinutes: 380, energy: 3, checkedIn: false };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => summary;
export function updateHomeSummary(patch: Partial<typeof summary>) {
  if (Object.entries(patch).every(([key, value]) => summary[key as keyof typeof summary] === value)) return;
  summary = { ...summary, ...patch };
  listeners.forEach(listener => listener());
}
export const useHomeSummary = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
