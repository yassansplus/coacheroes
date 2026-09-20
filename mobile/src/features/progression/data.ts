import type { Measurement, Session, WeightEntry, BoxingTest } from './types';

export const referenceDate = '2026-09-15';
export const startDate = '2026-07-03';
export const number = (value: number, digits = 1) => value.toLocaleString('fr-FR', { maximumFractionDigits: digits });
export const dateLabel = (date: string, short = false) => new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: short ? 'short' : 'long' });
export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const daysBetween = (first: string, last: string) => Math.round((Date.parse(`${last}T12:00:00Z`) - Date.parse(`${first}T12:00:00Z`)) / 86400000);
export const weights: WeightEntry[] = Array.from({ length: 90 }, (_, index) => {
  const date = new Date(2026, 5, 18 + index);
  return { date: dayKey(date), value: Number((80.5 - index * 0.034 + Math.sin(index * 1.7) * 0.24).toFixed(1)) };
});
export const measurements: Measurement[] = [
  { date: '2026-06-15', waist: 90, chest: 99, arm: 33, thigh: 57 },
  { date: '2026-07-15', waist: 88, chest: 100, arm: 33.5, thigh: 57.3 },
  { date: '2026-08-15', waist: 86, chest: 101, arm: 34, thigh: 57.6 },
  { date: referenceDate, waist: 84, chest: 102, arm: 35, thigh: 58 },
];
export const measureLabels = { waist: 'Tour de taille', chest: 'Poitrine', arm: 'Bras', thigh: 'Cuisses' };
export const sessions: Session[] = Array.from({ length: 74 }, (_, index) => {
  const date = new Date(2026, 6, 3 + index);
  const weekday = date.getDay();
  const sport = weekday === 1 || weekday === 4 ? 'strength' : weekday === 2 || weekday === 6 ? 'boxing' : 'rest';
  const missed = sport !== 'rest' && index % 17 === 4;
  return { date: dayKey(date), sport, missed, minutes: sport === 'rest' || missed ? 0 : sport === 'boxing' ? 50 : 60, rounds: sport === 'boxing' && !missed ? 9 : 0 };
});
export const boxingTests: BoxingTest[] = [
  { id: 'sac-start', date: '2026-08-18', kind: 'Sac', value: 168 },
  { id: 'corde-start', date: '2026-08-18', kind: 'Corde', value: 260 },
  { id: 'sac-last', date: referenceDate, kind: 'Sac', value: 204 },
  { id: 'corde-last', date: referenceDate, kind: 'Corde', value: 430 },
  { id: 'sparring', date: referenceDate, kind: 'Sparring', value: 6 },
];
export const exercises = [
  { id: 'bench', title: 'Développé couché', unit: 'kg', loads: [57.5, 62.5, 67.5, 70], maxes: [72.5, 77.5, 82.5, 87.5], volumes: [14500, 15800, 16450, 18420] },
  { id: 'pullups', title: 'Tractions', unit: 'rép.', loads: [4, 5, 6, 8], maxes: [4, 5, 6, 8], volumes: [48, 60, 74, 96] },
  { id: 'squat', title: 'Squat', unit: 'kg', loads: [65, 70, 75, 80], maxes: [80, 87.5, 95, 102.5], volumes: [15600, 16200, 17600, 19200] },
];
export function movingAverage(entries: WeightEntry[]) {
  return entries.map(entry => {
    const window = entries.filter(item => daysBetween(item.date, entry.date) >= 0 && daysBetween(item.date, entry.date) < 7);
    return { ...entry, value: window.reduce((sum, item) => sum + item.value, 0) / window.length };
  });
}

export function withinDays<T extends { date: string }>(entries: T[], days: number, end: string) {
  return entries.filter(item => daysBetween(item.date, end) >= 0 && daysBetween(item.date, end) < days);
}
