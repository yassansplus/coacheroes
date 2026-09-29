import { getLocale } from '@/i18n/core';
import type { WeightEntry } from './types';

export const number = (value: number, digits = 1) => value.toLocaleString(getLocale(), { maximumFractionDigits: digits });
export const dateLabel = (date: string, short = false) => new Date(`${date}T12:00:00`).toLocaleDateString(getLocale(), { day: 'numeric', month: short ? 'short' : 'long' });
export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const daysBetween = (first: string, last: string) => Math.round((Date.parse(`${last}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / 86400000);
export const measureLabels = { waist: 'Tour de taille', chest: 'Poitrine', arm: 'Bras', thigh: 'Cuisses' };
export function movingAverage(entries: WeightEntry[]) {
  return entries.map(entry => {
    const window = entries.filter(item => daysBetween(item.date, entry.date) >= 0 && daysBetween(item.date, entry.date) < 7);
    return { ...entry, value: window.reduce((sum, item) => sum + item.value, 0) / window.length };
  });
}
export function withinDays<T extends { date: string }>(entries: T[], days: number, end: string) {
  return entries.filter(item => daysBetween(item.date, end) >= 0 && daysBetween(item.date, end) < days);
}
