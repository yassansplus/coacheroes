import { useSyncExternalStore } from 'react';

// Frontend preview only: retained in memory for the current app session.
let summary = { age: '28', height: '177', goals: 'Recomposition' };
const listeners = new Set<() => void>();
export function updateProfileSummary(patch: Partial<typeof summary>) {
  summary = { ...summary, ...patch };
  listeners.forEach(listener => listener());
}
export function useProfileSummary() {
  return useSyncExternalStore(callback => {
    listeners.add(callback);
    return () => { listeners.delete(callback); };
  }, () => summary, () => summary);
}
