import { t, type Language } from '@/i18n/core';
import { colors } from '@/theme/colors';
import type { TrainingProgram } from '@/services/trainingProgram';
import type { SquadOverview } from '@/services/squad/types';

export type HomeWidgetSnapshot = {
  date: string; updated: string; heading: string; caloriesLabel: string; calories: string;
  goal: string; progress: number; remaining: string; workoutLabel: string; workout: string;
  workoutDetail: string; workoutDone: boolean; squadLabel: string; news: string[];
  emptyNews: string; openLabel: string; signedIn: boolean; palette: typeof colors;
};
export const widgetDay = (now: Date) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
export function nextWidgetDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

/** A small presentation-only projection. No tokens, IDs, photos or private friend metrics. */
export function widgetSnapshot(input: {
  language: Language; now: Date; userId?: string; calories?: number | null; calorieGoal?: number | null;
  program?: TrainingProgram | null; completed?: boolean; blockDue?: boolean; squad?: SquadOverview | null;
}): HomeWidgetSnapshot {
  const tr = (text: string, values?: Record<string, unknown>) => t(text, values, input.language);
  const locale = { fr: 'fr-FR', en: 'en-GB', nl: 'nl-NL' }[input.language];
  const number = (value: number) => Math.round(value).toLocaleString(locale);
  const knownCalories = typeof input.calories === 'number' && Number.isFinite(input.calories);
  const goal = typeof input.calorieGoal === 'number' && input.calorieGoal > 0 ? input.calorieGoal : null;
  const calories = knownCalories ? Math.max(0, input.calories!) : null;
  const programme = input.program?.status === 'ready' && input.program.acceptedAt && !input.program.stale ? input.program : null;
  const session = programme?.result?.sessions.find(s => s.weekday === (input.now.getDay() + 6) % 7);
  const signedIn = Boolean(input.userId);
  const friends = new Map(input.squad?.friends.filter(f => f.shareActivity).map(f => [f.id, f]) ?? []);
  const news = [...(input.squad?.activity ?? [])]
    .filter(event => friends.has(event.userId) && Date.parse(event.at) <= input.now.getTime() && Date.parse(event.at) >= input.now.getTime() - 86400_000)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 2).map(event => tr('{name} a terminé une séance', { name: friends.get(event.userId)!.name }));
  return {
    date: widgetDay(input.now), palette: colors, signedIn,
    heading: tr('Aujourd’hui'), updated: tr('À jour à {time}', { time: input.now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) }),
    caloriesLabel: tr('Calories'), calories: signedIn && calories !== null ? number(calories) : '—',
    goal: goal && signedIn ? `/ ${number(goal)} kcal` : tr('Objectif à définir'),
    progress: signedIn && calories !== null && goal ? Math.max(0, Math.min(1, calories / goal)) : 0,
    remaining: signedIn && calories !== null && goal ? tr(calories > goal ? '{p0} kcal au-dessus de l’objectif' : '{p0} kcal restantes', { p0: number(Math.abs(goal - calories)) }) : tr('Ouvre l’app pour actualiser'),
    workoutLabel: tr('Ta séance'),
    workout: !signedIn ? tr('Connecte-toi') : input.blockDue ? tr('Bloc terminé !') : input.completed ? tr('Séance terminée') : session?.name || (programme ? tr('Jour de récup') : tr('Mon programme')),
    workoutDetail: !signedIn ? tr('Retrouve ta journée ici') : input.blockDue ? tr('Voir mon bilan') : input.completed ? tr('Place à la récup !') : session ? `${session.estimatedMinutes} min` : programme ? tr('À ton rythme') : tr('Ouvre l’app pour actualiser'),
    workoutDone: signedIn && Boolean(input.completed), squadLabel: tr('Squad'), news: signedIn ? news : [],
    emptyNews: tr('Ensemble, on va plus loin'), openLabel: tr('Ouvrir'),
  };
}

export function expiredWidgetSnapshot(language: Language, now: Date): HomeWidgetSnapshot {
  const snapshot = widgetSnapshot({ language, now });
  return { ...snapshot, heading: t('Nouvelle journée', undefined, language), workout: t('Ouvre l’app pour actualiser', undefined, language), updated: '', goal: 'kcal' };
}
