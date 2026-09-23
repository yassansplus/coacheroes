import { profileSchema } from '../onboarding/onboarding.schema';
import { coachingDetailsSchema, sportSchema } from './planning';
import type { CoachingQuestion } from './questions';
import type { CoachingAnswer } from './chat-ai';
// Pure projection: an answer can only modify the field that was actually asked about.
export function projectAnswer(profile: Record<string, unknown>, details: Record<string, unknown>, firstName: string | null,
  question: CoachingQuestion, answer: CoachingAnswer, userText: string) {
  if (!answer.understood) return null;
  const p = profileSchema.parse(profile), c = coachingDetailsSchema.parse(details);
  let name = firstName;
  switch (question.key) {
    case 'firstName':
      if (!answer.firstName || (answer.firstName !== 'toi' && !userText.toLocaleLowerCase().includes(answer.firstName.toLocaleLowerCase()))) return null;
      name = answer.firstName; break;
    case 'availability': {
      if (!answer.weekdays?.length || !answer.sessionsPerWeek || !answer.durationMinutes) return null;
      const days = [...new Set(answer.weekdays)];
      if (days.length < answer.sessionsPerWeek) return null;
      p.days = days; p.sessions = answer.sessionsPerWeek; p.duration = String(answer.durationMinutes) as typeof p.duration;
      p.skippedSteps = p.skippedSteps.filter(n => n !== 7); break;
    }
    case 'equipment':
      if (!answer.gymType || answer.equipment === null) return null;
      p.gymType = answer.gymType; p.equipment = [...new Set(answer.equipment)]; p.skippedSteps = p.skippedSteps.filter(n => n !== 8); break;
    case 'schedule': {
      const sport = sportSchema.parse(question.sport);
      if (!p.sports.includes(sport) || sport === 'strength' || !answer.scheduleMode) return null;
      const days = [...new Set(answer.fixedWeekdays ?? [])];
      if (answer.scheduleMode === 'fixed' && !days.length) return null;
      c.schedules = c.schedules.filter(s => s.sport !== sport);
      c.schedules.push({ sport, mode: answer.scheduleMode, weekdays: answer.scheduleMode === 'fixed' ? days : [], minutes: answer.scheduleMode === 'fixed' ? answer.fixedMinutes : null }); break;
    }
    case 'restriction': c.restrictionNotes = userText; break;
    case 'program_note': if (c.notes.length >= 10) return null; c.notes.push(userText); break;
  }
  return { profile: profileSchema.parse(p), details: coachingDetailsSchema.parse(c), firstName: name };
}
