import { useSyncExternalStore } from 'react';

export type Equipment = { frame: string; title: string; theme: string };
let state = { level: 8, xp: 320, total: 3820, weekly: 740, claimed: [] as string[], abandoned: [] as string[], equipment: { frame: 'azur', title: 'confirmed', theme: 'light' } as Equipment };
const listeners = new Set<() => void>();
function publish(patch: Partial<typeof state>) { state = { ...state, ...patch }; listeners.forEach(listener => listener()); }
export function useGameProgress() { return useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => state, () => state); }
// Local preview only. Server-side reward rules and persistence will replace this.
export function claimGameReward(id: string, xp: number) {
  if (state.claimed.includes(id) || state.abandoned.includes(id)) return false;
  const level = state.level + Math.floor((state.xp + xp) / 500);
  const leveledUp = level > state.level;
  publish({ level, xp: (state.xp + xp) % 500, total: state.total + xp, weekly: state.weekly + xp, claimed: [...state.claimed, id] });
  return leveledUp;
}
export function abandonGameMission(id: string) { if (!state.claimed.includes(id)) publish({ abandoned: [...new Set([...state.abandoned, id])] }); }
export function equipGameItems(equipment: Equipment) { publish({ equipment }); }
