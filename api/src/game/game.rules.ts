export const xpRules = {
  onboarding: 100,
  programAccepted: 20,
  plannedWorkout: 100,
  freeWorkout: 60,
  daily: 20,
  meal: 10,
  weeklyPlan: 80,
  weeklyCheckins: 40,
  programReview: 50,
  friendship: 10,
  group: 5,
  challengeJoin: 5,
  challengeComplete: 20,
  coachDecision: 5,
  progression: 5,
  photo: 5,
  avatar: 5,
} as const;

export function levelProgress(total: number) {
  let level = 1, xp = Math.max(0, Math.floor(total));
  let target = Math.min(1000, (level + 1) * 100);
  while (xp >= target) {
    xp -= target;
    level++;
    target = Math.min(1000, (level + 1) * 100);
  }
  return { level, xp, target };
}

export function weekOf(date: string) {
  const day = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(day.getTime())) return '';
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}

export function dateInTimezone(at: Date, timezone: string) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at); }
  catch { return at.toISOString().slice(0, 10); }
}
