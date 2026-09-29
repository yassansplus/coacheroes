import { useSyncExternalStore } from 'react';
import type { GameProgressResponse, Equipment } from '@/services/game';

export type { Equipment } from '@/services/game';
export type GameProgress = Omit<GameProgressResponse, 'events' | 'latestEventId' | 'nextEventId'> & { loading: boolean; equipment: Equipment };
const initial: GameProgress = {
  level: 1, xp: 0, target: 200, total: 0, weekly: 0, recent: [], breakdown: {}, badges: [], loading: true,
  missions: { daily: { checkin: false, meals: 0, workout: false }, weekly: { plan: { completed: 0, target: 0, awarded: false }, checkins: { completed: 0, target: 4 } } },
  equipment: { frame: 'none', title: 'none', theme: 'light' }, unlockedRewards: [],
};
let state = initial;
const listeners = new Set<() => void>();
function publish(next: GameProgress) { state = next; listeners.forEach(listener => listener()); }
export function useGameProgress() { return useSyncExternalStore(callback => { listeners.add(callback); return () => { listeners.delete(callback); }; }, () => state, () => state); }
export function setGameProgress(response: GameProgressResponse) {
  const { events: _events, latestEventId: _latest, nextEventId: _next, ...data } = response;
  publish({ ...state, ...data, loading: false });
}
export function resetGameProgress() { publish(initial); }
export function equipGameItems(equipment: Equipment) { publish({ ...state, equipment }); }
