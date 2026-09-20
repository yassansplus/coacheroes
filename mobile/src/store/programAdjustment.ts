import { useEffect, useSyncExternalStore } from 'react';

export const initialCoachSets: Record<string, number> = { bench: 3, pulldown: 3, legpress: 3, shoulders: 3, legcurl: 2, lateral: 2, curl: 1, triceps: 1 };
export const lightCoachSets: Record<string, number> = { ...initialCoachSets, shoulders: 2, legcurl: 1, lateral: 0 };

/** Client-only user decision shared by Coach and Programme; no remote data. */
export type ProgramAdjustment = {
  proposalId: string; workoutId: string; scope: 'week' | 'ongoing';
  appliedAt: number; expiresAt: number | null; minutes: number; rir: number;
  sets: Record<string, number>;
};
let adjustment: ProgramAdjustment | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => adjustment;
export function useProgramAdjustment() {
  const value = useSyncExternalStore(subscribe, snapshot, snapshot);
  useEffect(() => {
    if (!value?.expiresAt) return;
    const timer = setTimeout(() => { if (adjustment === value) setProgramAdjustment(null); }, Math.max(0, value.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [value]);
  return value;
}
export function setProgramAdjustment(value: ProgramAdjustment | null) { adjustment = value; listeners.forEach(listener => listener()); }
export function activeProgramAdjustment(value: ProgramAdjustment | null, now = Date.now()) { return value && (value.expiresAt === null || value.expiresAt > now) ? value : null; }
