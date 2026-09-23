import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { useSession } from '@/providers/SessionProvider';
import { readWorkouts } from '@/storage/workouts';
import { listWorkouts, type WorkoutSnapshot } from '@/services/workouts';
import { completedPlannedWorkoutToday } from '@/services/workouts/completion';

export function useCompletedDailyWorkout() {
  const { user } = useSession();
  const [completed, setCompleted] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    let remote: { id: string; snapshot: WorkoutSnapshot }[] = [];
    setCompleted(false);
    if (!user) return;
    const update = async () => {
      const local = Object.values((await readWorkouts(user.id)).sessions);
      const sessions = new Map(remote.map(row => [row.id, row.snapshot]));
      for (const row of local) sessions.set(row.id, row.snapshot);
      if (active) setCompleted([...sessions.values()].some(snapshot => completedPlannedWorkoutToday(snapshot)));
    };
    const refresh = async () => {
      await update();
      try { remote = await listWorkouts(); await update(); } catch { /* Keep the local completion offline. */ }
    };
    void refresh().catch(() => undefined);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh().catch(() => undefined); });
    const timer = setInterval(() => void update().catch(() => undefined), 60000);
    return () => { active = false; subscription.remove(); clearInterval(timer); };
  }, [user?.id]));
  return completed;
}
