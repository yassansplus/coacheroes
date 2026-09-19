import type { ComplementarySport, FoodInputs, FoodSection, OnboardingProfile, Sport } from './types';

export function toggleItem<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter(value => value !== item) : [...items, item];
}
/** Strength training remains the base, even after removing every optional sport. */
export function toggleComplementarySport(sports: Sport[], sport: ComplementarySport): Sport[] {
  return ['strength', ...toggleItem(sports.filter(value => value !== 'strength'), sport)];
}
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}
export function normalizeNumber(value: string): string {
  return value.replace(/[^\d.,]/g, '').replace('.', ',');
}
export function parseNumber(value: string): number { return Number(value.replace(',', '.')); }
export function inRange(value: string, minimum: number, maximum: number): boolean {
  return value.trim() !== '' && /^\d+(?:[.,]\d+)?$/.test(value) && parseNumber(value) >= minimum && parseNumber(value) <= maximum;
}

type FoodOption = { value: string; title: string };
type FoodPreferences = Pick<OnboardingProfile, 'likedFoods' | 'avoidedFoods'>;

export function foodLabel(value: string, options: readonly FoodOption[]): string {
  return options.find(option => option.value === value)?.title ?? value;
}

/** Keep preset IDs, preserve free text and deduplicate equivalent French labels. */
export function setFoodSelections(profile: FoodPreferences, section: FoodSection, values: string[], options: readonly FoodOption[]): FoodPreferences {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const seen = new Set<string>();
  const selected = values.map(value => value.trim().replace(/\s+/g, ' ')).filter(Boolean).map(value =>
    options.find(option => normalize(option.title) === normalize(value) || option.value === value)?.value ?? value
  ).filter(value => {
    const key = normalize(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).filter(value => value !== 'none' || (section === 'avoided' && seen.size === 1));
  const includes = (value: string) => selected.some(item => normalize(item) === normalize(value));
  if (section === 'liked') {
    return { likedFoods: selected, avoidedFoods: profile.avoidedFoods.filter(value => !includes(value) &&
      !(value === 'lactose' && selected.includes('yogurt') && !profile.likedFoods.includes('yogurt')) &&
      !(value === 'gluten' && selected.includes('pasta') && !profile.likedFoods.includes('pasta'))) };
  }
  return { avoidedFoods: selected, likedFoods: profile.likedFoods.filter(value => !includes(value) &&
    !(selected.includes('lactose') && value === 'yogurt') && !(selected.includes('gluten') && value === 'pasta')) };
}

export function commitFoodInputs(profile: FoodPreferences, inputs: FoodInputs, options: readonly FoodOption[]): FoodPreferences {
  let result: FoodPreferences = { likedFoods: profile.likedFoods, avoidedFoods: profile.avoidedFoods };
  for (const section of ['liked', 'avoided'] as const) {
    if (!inputs[section].trim()) continue;
    const current = section === 'liked' ? result.likedFoods : result.avoidedFoods;
    result = setFoodSelections(result, section, [...current, ...inputs[section].split(/[,\n]+/)], options);
  }
  return result;
}

export function validateStep(step: number, profile: OnboardingProfile): string | null {
  if (step === 2 && !profile.goal.length) return 'Choisis au moins un objectif pour continuer.';
  if (step === 3) {
    if (!inRange(profile.age, 18, 100) || !Number.isInteger(parseNumber(profile.age))) return 'Indique un âge entre 18 et 100 ans.';
    if (!inRange(profile.height, 100, 250)) return 'Indique une taille entre 100 et 250 cm.';
    if (!inRange(profile.weight, 30, 350)) return 'Indique un poids entre 30 et 350 kg.';
  }
  if (step === 4 && !profile.level) return 'Choisis ton niveau actuel pour continuer.';
  if (step === 6) {
    if (!profile.sports.length) return 'Choisis au moins un sport.';
    if (!profile.places.length) return 'Choisis au moins un lieu d’entraînement.';
  }
  if (step === 7) {
    if (!profile.days.length) return 'Choisis au moins un jour disponible, ou passe cette étape.';
    if (profile.sessions > profile.days.length) return 'Sélectionne au moins autant de jours que de séances.';
  }
  if (step === 8 && !profile.gymType) return 'Choisis ton lieu habituel, ou passe cette étape.';
  if (step === 9 && !profile.noPain && !profile.pains.length && !profile.painNotes.trim()) return 'Indique une zone douloureuse ou active « Aucune douleur actuellement ».';
  if (step === 13 && Object.values(profile.measurements).some(value => value && !inRange(value, 10, 250))) return 'Les mensurations doivent être comprises entre 10 et 250 cm, ou laissées vides.';
  return null;
}

/** Local preview only: no AI call and no medical/nutritional prescription. */
export function buildPreviewSchedule(profile: OnboardingProfile) {
  const days = profile.skippedSteps.includes(7) ? [0, 2, 4] : [...profile.days].sort().slice(0, profile.sessions);
  return Array.from({ length: 7 }, (_, day) => {
    const index = days.indexOf(day);
    return { day, sport: index < 0 ? null : profile.sports[index % profile.sports.length] ?? 'strength',
      minutes: profile.skippedSteps.includes(7) ? 60 : Number(profile.duration) };
  });
}
