import type { TrainingProgram } from '@/services/trainingProgram';
import type { Workout } from './types';

const sportTitles: Record<string, string> = {
  strength: 'Musculation', boxing: 'Boxe', running: 'Course à pied', cycling: 'Vélo',
  swimming: 'Natation', walking: 'Marche', yoga: 'Yoga', pilates: 'Pilates',
  football: 'Football', basketball: 'Basketball', tennis: 'Tennis', padel: 'Padel', crossfit: 'CrossFit',
};

export function generatedWorkout(program: TrainingProgram, index: number): Workout | null {
  const session = program.result?.sessions[index];
  if (program.status !== 'ready' || program.stale || !session) return null;
  const catalog = new Map(program.exercises.map(e => [e.id, e]));
  if (session.exercises.some(e => !catalog.has(e.exerciseId))) return null;
  const title = sportTitles[session.sport ?? 'strength'] ?? 'Sport';
  return { programVersionId:program.proposalId, sessionIndex:index, sport:session.sport ?? 'strength', week:Math.max(1,Math.floor((Date.now()-new Date(program.acceptedAt ?? Date.now()).getTime())/604800000)+1), id: `generated-${program.proposalId ?? program.sourceRevision}-${index}`, name: title,
    description: title, minutes: session.estimatedMinutes, day: (session.weekday + 1) % 7,
    icon: session.sport === 'boxing' ? 'punchingBag' : session.sport === 'running' ? 'shoe' : 'dumbbell', kind: session.sport && session.sport !== 'strength' ? 'free' : 'strength', sportBlocks: session.blocks, generated: true, warmupMinutes: session.warmupMinutes, warmupGuidance: session.warmup,
    prescribedExercises: session.exercises.map(e => ({ id: `wger-${e.exerciseId}`, name: catalog.get(e.exerciseId)!.name,
      muscle: catalog.get(e.exerciseId)!.muscles.map(m => m.name).join(', '), equipment: catalog.get(e.exerciseId)!.equipment.map(m => m.name).join(', '), icon: 'dumbbell', weight: 0, minReps: e.minReps, maxReps: e.maxReps,
      targetReps: e.minReps, restSeconds: e.restSeconds, rir: e.rir, guidance: e.guidance,
      progression: e.progression, sets: Array.from({ length: e.sets }, () => null), previous: { weight: 0, reps: [] } })),
  };
}
