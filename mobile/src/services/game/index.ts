import { apiRequest } from '@/services/http';
import type { BadgeId } from '@/config/badges';

export type GameBadge = { id: BadgeId; current: number; target: number; unlockedAt: string | null; celebratedAt: string | null };
export type Equipment = { frame: string; title: string; theme: string };

export type GameXpEvent = { id: number; rule: string; sourceKey: string; category: string; title: string; xp: number; occurredAt: string };
export type GameProgressResponse = {
  level: number; xp: number; target: number; total: number; weekly: number;
  latestEventId: number; nextEventId: number; events: GameXpEvent[]; recent: GameXpEvent[];
  breakdown: Record<string, number>;
  badges: GameBadge[];
  equipment: Equipment;
  unlockedRewards: string[];
  missions: {
    daily: { checkin: boolean; meals: number; workout: boolean };
    weekly: { plan: { completed: number; target: number; awarded: boolean }; checkins: { completed: number; target: number } };
  };
};

export const getGameProgress = (after?: number) => apiRequest<GameProgressResponse>(`/game${after === undefined ? '' : `?after=${after}`}`);
export const celebrateGameBadges = (ids: BadgeId[]) => apiRequest<{ ok: boolean }>('/game/badges/celebrated', { method: 'POST', body: { ids } });
export const saveGameEquipment = (equipment: Equipment) => apiRequest<{ equipment: Equipment }>('/game/equipment', { method: 'PUT', body: equipment });
