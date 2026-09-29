import { coachingDetailsSchema } from '../chat/planning';
import { profileSchema } from '../onboarding/onboarding.schema';

export function buildTrainingContext(profile: Record<string, unknown>, revision: number, firstName: string | null = null, details: Record<string, unknown> = {}, language: 'fr' | 'en' | 'nl' = 'fr') {
  const p = profileSchema.parse(profile);
  const coaching = coachingDetailsSchema.parse(details);
  const number = (value: string) => value.trim() ? Number(value.replace(',', '.')) : null;
  const mapping: Record<string, number[]> = { dumbbells: [3], barbell: [1], cables: [12], bodyweight: [7],
    bench: [8], 'pull-up bar': [6], kettlebell: [10], 'resistance band': [11] };
  const fullGym = !p.skippedSteps.includes(8) && p.gymType === 'full' && !p.equipment.length;
  const allowedEquipmentIds = p.skippedSteps.includes(8) ? [] : fullGym
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    : [...new Set([7, ...p.equipment.flatMap(item => mapping[item.toLowerCase()] ?? [])])];
  return {
    schemaVersion: 2, profileRevision: revision, locale: language, firstName,
    selectedSports: p.sports,
    sportSchedules: p.sports.filter(s => s !== 'strength').map(sport => coaching.schedules.find(s => s.sport === sport) ?? { sport, mode: p.places.includes('club') ? 'unknown' as const : 'coach' as const, weekdays: [] as number[], minutes: null }),
    coachingNotes: coaching.notes, restrictionNotes: coaching.restrictionNotes,
    objectives: { selected: p.goal, priority: p.goal.length === 1 ? p.goal[0] : null },
    physical: { ageYears: number(p.age), heightCm: number(p.height), weightKg: number(p.weight), gender: p.gender },
    experience: { level: p.level, performances: p.skippedSteps.includes(5) ? null : p.performances.map(x => ({ ...x, repetitionsAtWeight: null })) },
    availability: p.skippedSteps.includes(7) ? null : { weekdaysMondayZero: p.days, sessionsPerWeek: p.sessions, maxSessionMinutes: Number(p.duration), timeOfDay: p.timeOfDay },
    equipment: p.skippedSteps.includes(8) ? null : { gymType: p.gymType, items: p.equipment, allowedEquipmentIds,
      assumption: fullGym ? 'Salle complète : matériel standard wger présumé disponible, à confirmer avant usage.' : null,
      unmappedItems: p.equipment.filter(item => !mapping[item.toLowerCase()]) },
    places: p.places, otherSports: p.sports.filter(x => x !== 'strength'),
    restrictions: { noPainDeclared: p.noPain, painLocations: p.pains, userNotes: p.painNotes },
    recovery: p.skippedSteps.includes(10) ? null : { sleepMinutes: p.sleep, dailyActivity: p.activity, steps: p.steps },
    unknowns: ['repetitionsAtWeight', ...(p.goal.length > 1 ? ['objectivePriority'] : [])],
  };
}
export type TrainingContext = ReturnType<typeof buildTrainingContext> & {
  forceGeneration?: boolean;
  generationAssumptions?: string[];
  renewal?: boolean;
  regeneration?: boolean;
  sourceBlockId?: string;
  previousProgram?: unknown;
  blockSummary?: unknown;
  trainingHistory?: unknown[];
  renewalAnswers?: unknown;
  renewalAnalysis?: unknown;
  renewalAnalysisTrace?: unknown;
};
export function withForcedGeneration(context: TrainingContext): TrainingContext {
  const assumptions: string[] = [];
  const schedules = context.sportSchedules.map(schedule => {
    if (schedule.mode !== 'unknown') return schedule;
    assumptions.push(`Jours de ${schedule.sport} non précisés : le coach les organise.`);
    return { ...schedule, mode: 'coach' as const };
  });
  let availability = context.availability;
  if (!availability) {
    const fixedDays = schedules.filter(s => s.mode === 'fixed').flatMap(s => s.weekdays);
    const days = [...new Set([...fixedDays, 0, 2, 4, 1, 3, 5, 6])];
    const sessionsPerWeek = Math.max(3, context.selectedSports.length, fixedDays.length + context.selectedSports.length - schedules.filter(s => s.mode === 'fixed').length);
    availability = { weekdaysMondayZero: days, sessionsPerWeek, maxSessionMinutes: Math.max(45, ...schedules.filter(s => s.mode === 'fixed').map(s => s.minutes ?? 45)), timeOfDay: 'evening' };
    assumptions.push('Disponibilités non précisées : proposition sur trois jours ou plus selon les sports, à ajuster avant validation.');
  }
  let equipment = context.equipment;
  if (!equipment) {
    equipment = { gymType: 'home', items: [], allowedEquipmentIds: [7], assumption: 'Matériel non précisé : exercices au poids du corps uniquement.', unmappedItems: [] };
    assumptions.push('Matériel non précisé : exercices au poids du corps uniquement.');
  }
  return { ...context, sportSchedules: schedules, availability, equipment, forceGeneration: true, generationAssumptions: assumptions };
}
export function requiredClarifications(c: TrainingContext): string[] {
  const questions: string[] = [];
  if (!c.firstName) questions.push('Au fait, comment tu t’appelles ?');
  if (c.sportSchedules.some(s => s.mode === 'unknown')) questions.push('Tes séances au club sont à jours fixes ou je te cale ça ?');
  if (c.availability && c.selectedSports.length > c.availability.sessionsPerWeek) questions.push('Tu as plus de sports que de créneaux. On ajuste tes disponibilités ?');
  if (!c.availability || !c.availability.weekdaysMondayZero.length || c.availability.sessionsPerWeek > c.availability.weekdaysMondayZero.length)
    questions.push('Tu peux t’entraîner quels jours, combien de fois et pendant combien de temps ?');
  if (!c.equipment) questions.push('Tu as quel matériel pour la muscu ?');
  if ((!c.restrictions.noPainDeclared || c.restrictions.painLocations.length || c.restrictions.userNotes.trim()) && (!c.renewal || !c.restrictions.userNotes.trim()))
    questions.push('Tu as signalé une douleur. Quels mouvements te posent problème ?');
  const fixed = c.sportSchedules.filter(s => s.mode === 'fixed');
  if (c.availability && (fixed.some(s => s.weekdays.some(d => !c.availability!.weekdaysMondayZero.includes(d)) || (s.minutes ?? 0) > c.availability!.maxSessionMinutes) || fixed.reduce((n, s) => n + s.weekdays.length, 0) + c.selectedSports.length - fixed.length > c.availability.sessionsPerWeek)) questions.push('Tes créneaux ne couvrent pas encore tes séances fixes et la muscu. On ajuste ?');
  const fixedDays = fixed.flatMap(s => s.weekdays);
  if (new Set(fixedDays).size !== fixedDays.length) questions.push('Deux séances de club tombent le même jour. Laquelle peux-tu déplacer ?');
  return questions;
}
