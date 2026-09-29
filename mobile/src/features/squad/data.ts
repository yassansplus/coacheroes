import { getLocale } from '@/i18n/core';
import type { SquadPerson } from '@/services/squad';

export type Member = SquadPerson;
export type MemberId = string;
export type Page = { kind: 'home' | 'challenge' | 'ranking' | 'friends' | 'settings' | 'activity' | 'manage' }
  | { kind: 'member' | 'compare'; member: MemberId }
  | { kind: 'memberActivity'; member: MemberId };

export const sportLabel = (sport: string) => sport === 'strength' ? 'Musculation' : sport === 'boxing' ? 'Boxe' : sport === 'session' ? 'Séance' : sport === 'rest' ? 'Repos' : sport;
export const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
