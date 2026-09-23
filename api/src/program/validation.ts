import type { TrainingContext } from './context';
import type { ProgramResult } from './program.schema';
import { compatible, type CatalogExercise } from './wger.service';

import { EXERCISE_SELECTION_POLICY } from './exercise-policy';

export const RULES_VERSION = 'training-v3-simple-exercises';
export const rules = {
  exerciseSelection: EXERCISE_SELECTION_POLICY,
  scope: 'Tous les sports sélectionnés partagent le budget TOTAL de séances. Chaque séance possède son sport. Organiser soi-même les jours libres, respecter les jours fixes au club.',
  blockWeeks: 4, detailedWeek: 1, maxExercisesPerSession: 8, maxSetsPerSession: 24,
  minRir: 2, maxRir: 5, secondsPerRepForTimeEstimate: 4, transitionSecondsPerExercise: 60,
  progression: 'Progression conditionnelle selon les performances réelles ; aucune augmentation automatique ni charge initiale inventée.',
};
export function validateProgram(result: ProgramResult, c: TrainingContext, catalog: Map<number, CatalogExercise>): string[] {
  if (result.outcome === 'needs_clarification') return result.questions.length && !result.sessions.length ? [] : ['Une clarification exige des questions et aucune séance.'];
  const errors: string[] = [];
  if (result.questions.length) errors.push('Un programme prêt ne doit pas contenir de questions bloquantes.');
  if (!c.availability || result.sessions.length !== c.availability.sessionsPerWeek) errors.push('Nombre de séances incompatible.');
  if (new Set(result.sessions.map(s => s.weekday)).size !== result.sessions.length) errors.push('Jours de séances dupliqués.');
  for (const sport of c.selectedSports) if (!result.sessions.some(s => s.sport === sport)) errors.push(`Sport sélectionné absent : ${sport}.`);
  for (const schedule of c.sportSchedules.filter(s => s.mode === 'fixed')) {
    const actual = result.sessions.filter(s => s.sport === schedule.sport);
    if (actual.length !== schedule.weekdays.length || actual.some(s => !schedule.weekdays.includes(s.weekday) || s.setting !== 'club' || (schedule.minutes !== null && s.estimatedMinutes !== schedule.minutes))) errors.push(`Respecter les créneaux fixes de ${schedule.sport}.`);
  }
  for (const [index, session] of result.sessions.entries()) {
    const prefix = `Séance ${index + 1}: `;
    if (!c.selectedSports.includes(session.sport)) errors.push(prefix + 'sport non sélectionné.');
    if (session.sport === 'strength' && (session.exercises.length < 2 || session.blocks.length)) errors.push(prefix + 'la muscu exige des exercices du catalogue et aucun bloc libre.');
    if (session.sport !== 'strength' && (session.exercises.length || !session.blocks.length)) errors.push(prefix + 'ce sport exige des blocs chronométrés, sans exercices de muscu.');
    if (!c.availability?.weekdaysMondayZero.includes(session.weekday)) errors.push(prefix + 'jour indisponible.');
    if (new Set(session.exercises.map(e => e.exerciseId)).size !== session.exercises.length) errors.push(prefix + 'exercices dupliqués.');
    if (session.exercises.reduce((sum, e) => sum + e.sets, 0) > rules.maxSetsPerSession) errors.push(prefix + 'trop de séries.');
    let seconds = session.warmupMinutes * 60;
    for (const e of session.exercises) {
      const source = catalog.get(e.exerciseId);
      if (!source) errors.push(prefix + `exercice ${e.exerciseId} non consulté via les outils.`);
      else if (!compatible(source, c.equipment?.allowedEquipmentIds ?? [])) errors.push(prefix + `matériel incompatible pour ${e.exerciseId}.`);
      if (e.minReps > e.maxReps) errors.push(prefix + 'répétitions incohérentes.');
      seconds += e.sets * e.maxReps * rules.secondsPerRepForTimeEstimate + (e.sets - 1) * e.restSeconds + rules.transitionSecondsPerExercise;
    }
    if (session.sport !== 'strength') seconds += session.blocks.reduce((sum, block) => sum + block.minutes * 60, 0);
    const minutes = Math.ceil(seconds / 60);
    if (session.sport !== 'strength' && minutes !== session.estimatedMinutes) errors.push(prefix + 'les blocs et l’échauffement doivent couvrir la durée annoncée.');
    if (minutes > (c.availability?.maxSessionMinutes ?? 0) || session.estimatedMinutes > (c.availability?.maxSessionMinutes ?? 0)) errors.push(prefix + 'durée maximale dépassée.');
    if (session.estimatedMinutes < minutes) errors.push(prefix + `durée sous-estimée (minimum calculé ${minutes} min).`);
  }
  return errors;
}
