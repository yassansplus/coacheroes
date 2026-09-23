import type { TrainingContext } from '../program/context';
import { sportLabels } from './planning';
export type CoachingQuestion = { key: 'firstName' | 'availability' | 'equipment' | 'schedule' | 'restriction' | 'program_note'; text: string; choices: string[]; sport: string | null };
const question = (key: CoachingQuestion['key'], text: string, choices: string[] = [], sport: string | null = null): CoachingQuestion => ({ key, text, choices, sport });
export function nextQuestion(c: TrainingContext, programQuestion?: string): CoachingQuestion | null {
  if (!c.firstName) return question('firstName', 'Au fait, comment tu t’appelles ?');
  const name = c.firstName;
  if (!c.availability) return question('availability', `${name}, tu peux t’entraîner quels jours, combien de fois et pendant combien de temps ?`, ['Lundi, mercredi, vendredi : 3 séances de 45 min', 'Lundi, mardi, jeudi, samedi : 4 séances de 60 min']);
  if (!c.equipment) return question('equipment', `${name}, tu as quel matériel pour la muscu ?`, ['Salle complète', 'À la maison, sans matériel', 'À la maison, avec des haltères']);
  const unknown = c.sportSchedules.find(s => s.mode === 'unknown');
  if (unknown) return question('schedule', `Pour ${sportLabels[unknown.sport]}, tes jours sont fixés au club ou je te cale ça ?`, ['Organise les jours pour moi'], unknown.sport);
  const fixed = c.sportSchedules.filter(s => s.mode === 'fixed');
  const fixedDays = fixed.flatMap(s => s.weekdays);
  if (new Set(fixedDays).size !== fixedDays.length) return question('schedule', 'Deux séances de club tombent le même jour. Lesquelles peux-tu déplacer ?', [], fixed.find((s, i) => fixed.some((o, j) => i !== j && o.weekdays.some(d => s.weekdays.includes(d))))?.sport ?? null);
  if (c.selectedSports.length > c.availability.sessionsPerWeek || fixedDays.length + c.selectedSports.length - fixed.length > c.availability.sessionsPerWeek || fixed.some(s => s.weekdays.some(d => !c.availability!.weekdaysMondayZero.includes(d)) || (s.minutes ?? 0) > c.availability!.maxSessionMinutes))
    return question('availability', 'Il manque de la place pour tous tes sports. Quels jours, combien de séances et quelle durée peux-tu prévoir ?');
  if ((!c.restrictions.noPainDeclared || c.restrictions.painLocations.length || c.restrictions.userNotes.trim()) && !c.restrictionNotes)
    return question('restriction', 'Tu as signalé une douleur. Quels mouvements te posent problème et quels conseils as-tu reçus ?');
  if (programQuestion) return question('program_note', programQuestion.slice(0, 180));
  return null;
}
export function needsReview(c: TrainingContext) {
  return !c.restrictions.noPainDeclared || c.restrictions.painLocations.length > 0 || !!c.restrictions.userNotes.trim();
}
