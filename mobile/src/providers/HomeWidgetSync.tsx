import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { usePathname } from 'expo-router';
import { useLanguage } from '@/i18n/useLanguage';
import { useHomeSummary } from '@/store/homeSummary';
import { useSession } from './SessionProvider';
import { useTrainingProgramState } from './TrainingProgramProvider';
import { loadNutrition, nutritionDailyTotals } from '@/services/nutrition';
import { loadSquad } from '@/services/squad';
import { blockProgress, listWorkouts } from '@/services/workouts';
import { completedPlannedWorkoutToday } from '@/services/workouts/completion';
import { readWorkouts } from '@/storage/workouts';
import { getSessionToken } from '@/storage/session';
import { publishHomeWidget, supportsHomeWidget } from '@/services/widgets/bridge';
import { expiredWidgetSnapshot, nextWidgetDay, widgetDay, widgetSnapshot } from '@/services/widgets/model';

/** Refreshes the native snapshot using the same read APIs as the app. Never writes business data. */
export function HomeWidgetSync() {
  const { user, loading } = useSession();
  const { program, hydrated } = useTrainingProgramState();
  const language = useLanguage();
  const path = usePathname();
  const summary = useHomeSummary();
  const generation = useRef(0);
  const publishedOwner = useRef<string | null>(null);
  useEffect(() => {
    const version = ++generation.current;
    if (!supportsHomeWidget() || loading) return;
    let busy = false, alive = true;
    const publish = (props: ReturnType<typeof widgetSnapshot>) => {
      try { publishHomeWidget(props, { date: nextWidgetDay(new Date()), props: expiredWidgetSnapshot(language, nextWidgetDay(new Date())) }); }
      catch { /* A widget failure must never interrupt the main app. */ }
    };
    if (publishedOwner.current !== (user?.id ?? null)) {
      publish(widgetSnapshot({ language, now: new Date() }));
      publishedOwner.current = user?.id ?? null;
    }
    if (!user?.onboardingCompleted) { publish(widgetSnapshot({ language, now: new Date() })); return; }
    if (!hydrated) return;
    const owner = user.id;
    const token = getSessionToken();
    const refresh = async () => {
      if (busy || (AppState.currentState && AppState.currentState !== 'active')) return;
      busy = true;
      try {
        const [nutrition, squad, remote, local, block] = await Promise.allSettled([
          loadNutrition(), loadSquad(), listWorkouts(), readWorkouts(owner),
          program?.acceptedAt && program.status === 'ready' ? blockProgress(program.proposalId) : Promise.resolve(null),
        ]);
        if (!alive || generation.current !== version || token !== getSessionToken()) return;
        const now = new Date();
        const data = nutrition.status === 'fulfilled' ? nutrition.value : null;
        const sessions = new Map(remote.status === 'fulfilled' ? remote.value.map(row => [row.id, row.snapshot]) : []);
        if (local.status === 'fulfilled') for (const row of Object.values(local.value.sessions)) sessions.set(row.id, row.snapshot);
        publish(widgetSnapshot({ language, now, userId: owner, program,
          calories: data ? nutritionDailyTotals(data, widgetDay(now)).calories : null,
          calorieGoal: data?.plan?.status === 'ready' ? data.plan.targets?.calories : null,
          completed: [...sessions.values()].some(snapshot => completedPlannedWorkoutToday(snapshot, now)),
          blockDue: block.status === 'fulfilled' && Boolean(block.value?.due),
          squad: squad.status === 'fulfilled' ? squad.value : null,
        }));
      } finally { busy = false; }
    };
    const run = () => { void refresh().catch(() => {}); };
    // Debounce cascades when a save updates several providers at once.
    const first = setTimeout(run, 350);
    const timer = setInterval(run, 60000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') run(); });
    return () => { alive = false; clearTimeout(first); clearInterval(timer); listener.remove(); };
  }, [user?.id, user?.onboardingCompleted, loading, hydrated, program, language, path, summary.calories, summary.calorieGoal]);
  return null;
}
