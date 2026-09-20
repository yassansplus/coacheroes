import type { Exercise, Feeling, Workout } from './types';

export const workouts: Workout[] = [
  { id: 'muscu-a', name: 'Muscu A', description: 'Haut du corps', minutes: 60, day: 1, icon: 'dumbbell', kind: 'strength' },
  { id: 'boxe-a', name: 'Boxe', description: 'Technique · séance libre', minutes: 55, day: 2, icon: 'boxing', kind: 'free' },
  { id: 'muscu-b', name: 'Muscu B', description: 'Full body', minutes: 65, day: 4, icon: 'dumbbell', kind: 'strength' },
  { id: 'boxe-b', name: 'Boxe', description: 'Technique · séance libre', minutes: 55, day: 6, icon: 'boxing', kind: 'free' },
];
export const feelings: { value: Feeling; title: string; description: string }[] = [
  { value: 'easy', title: 'Facile', description: '3 répétitions ou plus en réserve' },
  { value: 'correct', title: 'Correct', description: 'Environ 2 répétitions en réserve' },
  { value: 'hard', title: 'Difficile', description: 'Environ 1 répétition en réserve' },
  { value: 'failure', title: 'Échec', description: 'Aucune répétition supplémentaire possible' },
];
type Template = Omit<Exercise, 'sets' | 'previous' | 'restSeconds' | 'targetReps'> & { count: number };
const templates: Template[] = [
  { id: 'bench', name: 'Développé couché', muscle: 'Pectoraux', equipment: 'Barre', icon: 'benchPress', weight: 60, minReps: 6, maxReps: 10, count: 3 },
  { id: 'pulldown', name: 'Tirage vertical', muscle: 'Dos', equipment: 'Machine', icon: 'pulley', weight: 45, minReps: 8, maxReps: 12, count: 3 },
  { id: 'legpress', name: 'Presse à cuisses', muscle: 'Jambes', equipment: 'Machine', icon: 'machine', weight: 90, minReps: 8, maxReps: 12, count: 3 },
  { id: 'shoulders', name: 'Développé épaules', muscle: 'Épaules', equipment: 'Haltères', icon: 'dumbbell', weight: 16, minReps: 8, maxReps: 12, count: 2 },
  { id: 'legcurl', name: 'Leg curl', muscle: 'Jambes', equipment: 'Machine', icon: 'machine', weight: 35, minReps: 10, maxReps: 15, count: 2 },
  { id: 'lateral', name: 'Élévations latérales', muscle: 'Épaules', equipment: 'Haltères', icon: 'dumbbell', weight: 8, minReps: 12, maxReps: 20, count: 2 },
  { id: 'curl', name: 'Curl haltères', muscle: 'Bras', equipment: 'Haltères', icon: 'dumbbell', weight: 10, minReps: 10, maxReps: 15, count: 3 },
  { id: 'triceps', name: 'Extension triceps', muscle: 'Bras', equipment: 'Machine', icon: 'pulley', weight: 20, minReps: 10, maxReps: 15, count: 2 },
];
export function createExercises(workoutId: string): Exercise[] {
  if (workoutId.startsWith('boxe')) return [];
  return templates.map(({ count, ...item }, index) => {
    const weight = workoutId === 'muscu-b' && index === 0 ? 55 : item.weight;
    return { ...item, weight, targetReps: item.minReps + 2, restSeconds: 120,
      sets: Array.from({ length: count }, () => null),
      previous: { weight, reps: Array.from({ length: count }, (_, i) => item.minReps + (i === count - 1 ? 1 : 2)) } };
  });
}
export function alternatives(exercise: Exercise): Exercise[] {
  const names: Record<string, [string, string, string]> = {
    Pectoraux: ['Chest press', 'Développé couché haltères', 'Écartés à la poulie'],
    Dos: ['Rowing machine', 'Rowing haltère', 'Tirage horizontal à la poulie'],
    Jambes: ['Presse horizontale', 'Squat gobelet', 'Pull-through à la poulie'],
    Épaules: ['Développé épaules guidé', 'Arnold press', 'Élévations latérales à la poulie'],
    Bras: ['Curl machine', 'Curl marteau', 'Extension triceps à la corde'],
  };
  const labels = names[exercise.muscle];
  return [
    { suffix: 'machine', name: labels?.[0] ?? `${exercise.muscle} · machine guidée`, equipment: 'Machine' as const, icon: 'machine' as const },
    { suffix: 'dumbbells', name: labels?.[1] ?? `${exercise.muscle} · haltères`, equipment: 'Haltères' as const, icon: 'dumbbell' as const },
    { suffix: 'cable', name: labels?.[2] ?? `${exercise.muscle} · poulie`, equipment: 'Machine' as const, icon: 'pulley' as const },
  ].map(item => ({ ...exercise, ...item, id: `${exercise.id}-${item.suffix}`, weight: 0,
    sets: exercise.sets.map(() => null), previous: { weight: 0, reps: [] } }));
}
