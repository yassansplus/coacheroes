import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '@/providers/SessionProvider';
import { useTrainingProgramState } from '@/providers/TrainingProgramProvider';

/** Reads the account-wide cached program first, then refreshes it in the background. */
export function useTrainingProgram(enabled = true, autoStart = false) {
  const { user } = useSession();
  const state = useTrainingProgramState();
  const autoStarted = useRef<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (enabled && user) void state.refresh();
  }, [enabled, state.refresh, user?.id]));

  useEffect(() => {
    if (!enabled || !autoStart || !user || !state.hydrated) return;
    const key = `${user.id}:${state.program?.proposalId ?? 'missing'}:${state.program?.sourceRevision ?? 'missing'}:${state.program?.stale ?? false}`;
    if (autoStarted.current === key) return;
    autoStarted.current = key;
    if (!state.program || state.program.stale) void state.start(false);
  }, [autoStart, enabled, state.hydrated, state.program, state.start, user?.id]);

  return {
    program: state.program,
    loading: enabled && !state.program && (!state.hydrated || state.refreshing || state.starting),
    error: state.error,
    start: () => state.start(true),
    refresh: state.refresh,
    accept: state.accept,
    accepting: state.accepting,
    acceptError: state.acceptError,
  };
}
