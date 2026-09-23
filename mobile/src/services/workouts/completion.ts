import type { WorkoutSnapshot } from './types';

export function completedPlannedWorkoutToday(snapshot: WorkoutSnapshot, now = new Date()): boolean {
  if (snapshot.status !== 'completed') return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (snapshot.workout.scheduledDate) return snapshot.workout.scheduledDate === today;
  const started = new Date(snapshot.startedAt);
  return snapshot.workout.day === now.getDay() && started.toDateString() === now.toDateString();
}
