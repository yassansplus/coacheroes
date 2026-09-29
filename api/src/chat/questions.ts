import type { TrainingContext } from '../program/context';
import { sportLabels } from './planning';
export type CoachingQuestion = { key: 'firstName' | 'availability' | 'equipment' | 'schedule' | 'restriction' | 'program_note'; text: string; choices: string[]; sport: string | null };
const question = (key: CoachingQuestion['key'], text: string, choices: string[] = [], sport: string | null = null): CoachingQuestion => ({ key, text, choices, sport });
const dutchSportLabels: Record<keyof typeof sportLabels, string> = { strength: 'krachttraining', boxing: 'boksen', running: 'hardlopen', cycling: 'fietsen', swimming: 'zwemmen', walking: 'wandelen', yoga: 'yoga', pilates: 'pilates', football: 'voetbal', basketball: 'basketbal', tennis: 'tennis', padel: 'padel', crossfit: 'crossfit' };
export function nextQuestion(c: TrainingContext, programQuestion?: string): CoachingQuestion | null {
  const en = c.locale === 'en';
  const nl = c.locale === 'nl';
  if (!c.firstName) return question('firstName', nl ? 'Hoe heet je trouwens?' : en ? 'By the way, what’s your name?' : 'Au fait, comment tu t’appelles ?');
  const name = c.firstName;
  if (!c.availability) return question('availability', nl ? `${name}, op welke dagen kun je trainen, hoe vaak en hoelang?` : en ? `${name}, which days can you train, how often and for how long?` : `${name}, tu peux t’entraîner quels jours, combien de fois et pendant combien de temps ?`, nl ? ['Maandag, woensdag, vrijdag: 3 trainingen van 45 min', 'Maandag, dinsdag, donderdag, zaterdag: 4 trainingen van 60 min'] : en ? ['Monday, Wednesday, Friday: 3 workouts of 45 min', 'Monday, Tuesday, Thursday, Saturday: 4 workouts of 60 min'] : ['Lundi, mercredi, vendredi : 3 séances de 45 min', 'Lundi, mardi, jeudi, samedi : 4 séances de 60 min']);
  if (!c.equipment) return question('equipment', nl ? `${name}, welk materiaal heb je voor krachttraining?` : en ? `${name}, what equipment do you have for strength training?` : `${name}, tu as quel matériel pour la muscu ?`, nl ? ['Volledig uitgeruste sportschool', 'Thuis, zonder materiaal', 'Thuis, met dumbbells'] : en ? ['Full gym', 'At home, without equipment', 'At home, with dumbbells'] : ['Salle complète', 'À la maison, sans matériel', 'À la maison, avec des haltères']);
  const unknown = c.sportSchedules.find(s => s.mode === 'unknown');
  if (unknown) return question('schedule', nl ? `Voor ${dutchSportLabels[unknown.sport]}: staan je clubdagen vast, of zal ik ze inplannen?` : en ? `For ${unknown.sport}, are your club days fixed, or shall I schedule them?` : `Pour ${sportLabels[unknown.sport]}, tes jours sont fixés au club ou je te cale ça ?`, nl ? ['Plan de dagen voor mij in'] : en ? ['Schedule the days for me'] : ['Organise les jours pour moi'], unknown.sport);
  const fixed = c.sportSchedules.filter(s => s.mode === 'fixed');
  const fixedDays = fixed.flatMap(s => s.weekdays);
  if (new Set(fixedDays).size !== fixedDays.length) return question('schedule', nl ? 'Twee clubtrainingen vallen op dezelfde dag. Welke kun je verplaatsen?' : en ? 'Two club sessions fall on the same day. Which can you move?' : 'Deux séances de club tombent le même jour. Lesquelles peux-tu déplacer ?', [], fixed.find((s, i) => fixed.some((o, j) => i !== j && o.weekdays.some(d => s.weekdays.includes(d))))?.sport ?? null);
  if (c.selectedSports.length > c.availability.sessionsPerWeek || fixedDays.length + c.selectedSports.length - fixed.length > c.availability.sessionsPerWeek || fixed.some(s => s.weekdays.some(d => !c.availability!.weekdaysMondayZero.includes(d)) || (s.minutes ?? 0) > c.availability!.maxSessionMinutes))
    return question('availability', nl ? 'Er is niet genoeg tijd voor al je sporten. Welke dagen, hoeveel trainingen en welke duur kun je plannen?' : en ? 'There isn’t enough time for all your sports. Which days, how many workouts and what duration can you plan?' : 'Il manque de la place pour tous tes sports. Quels jours, combien de séances et quelle durée peux-tu prévoir ?');
  if ((!c.restrictions.noPainDeclared || c.restrictions.painLocations.length || c.restrictions.userNotes.trim()) && !c.restrictionNotes)
    return question('restriction', nl ? 'Je hebt pijn gemeld. Welke bewegingen geven problemen en welk advies heb je gekregen?' : en ? 'You reported pain. Which movements cause problems, and what advice have you received?' : 'Tu as signalé une douleur. Quels mouvements te posent problème et quels conseils as-tu reçus ?');
  if (programQuestion) return question('program_note', programQuestion.slice(0, 180));
  return null;
}
export function needsReview(c: TrainingContext) {
  return !c.restrictions.noPainDeclared || c.restrictions.painLocations.length > 0 || !!c.restrictions.userNotes.trim();
}
