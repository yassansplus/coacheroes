import { getLocale, t } from '@/i18n/core';
import type { GameRecord } from './records';

export function recordTitle(record: GameRecord) {
  return record.category === 'boxing' ? t(record.title) : record.title;
}

export function recordDetail(record: GameRecord) {
  const value = record.value.toLocaleString(getLocale());
  switch (record.metric) {
    case 'weight': return t('{p0} kg × {p1}', { p0: value, p1: record.reps });
    case 'reps': return t('{p0} répétitions', { p0: value });
    case 'hits': return t('{p0} frappes en 3 min', { p0: value });
    case 'seconds': return t('{p0} min {p1} s sans arrêt', { p0: Math.floor(record.value / 60), p1: Math.round(record.value % 60) });
  }
}
export function recordDate(record: GameRecord) {
  return new Date(`${record.date}T12:00:00`).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}
