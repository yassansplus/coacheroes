import type { IllustrationName } from '@/components/Illustration';
import type { ProgressData } from '@/services/progression/types';

export type GameRecord = {
  id: string; performanceId: string; title: string; date: string;
  category: 'strength' | 'boxing'; icon: IllustrationName;
  metric: 'weight' | 'reps' | 'hits' | 'seconds'; value: number; reps?: number;
};

/** First measured performances establish a record; ties and onboarding baselines do not add one. */
export function buildGameRecords(data: Pick<ProgressData, 'exercises' | 'tests'>, today: string) {
  const history: GameRecord[] = [];
  for (const exercise of data.exercises) {
    let best: { weight: number; reps: number } | null = null;
    for (const point of [...exercise.points].sort((a, b) => a.date.localeCompare(b.date))) {
      if (point.baseline || point.date > today || !Number.isFinite(point.weight) || point.weight < 0 || !Number.isFinite(point.reps) || point.reps <= 0) continue;
      if (best && (point.weight < best.weight || point.weight === best.weight && point.reps <= best.reps)) continue;
      best = point;
      history.push({ id: `strength:${exercise.id}:${point.date}`, performanceId: `strength:${exercise.id}`,
        title: exercise.title, date: point.date, category: 'strength', icon: 'dumbbell',
        metric: point.weight > 0 ? 'weight' : 'reps', value: point.weight > 0 ? point.weight : point.reps, reps: point.reps });
    }
  }
  for (const kind of ['Sac', 'Corde'] as const) {
    let best = 0;
    for (const test of data.tests.filter(item => item.kind === kind).sort((a, b) => a.date.localeCompare(b.date))) {
      if (test.date > today || !Number.isFinite(test.value) || test.value <= best) continue;
      best = test.value;
      history.push({ id: `boxing:${test.id}`, performanceId: `boxing:${kind}`, title: kind, date: test.date,
        category: 'boxing', icon: kind === 'Sac' ? 'punchingBag' : 'shoe',
        metric: kind === 'Sac' ? 'hits' : 'seconds', value: test.value });
    }
  }
  history.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const records = history.filter(record => {
    if (seen.has(record.performanceId)) return false;
    seen.add(record.performanceId); return true;
  });
  return { records, history };
}
