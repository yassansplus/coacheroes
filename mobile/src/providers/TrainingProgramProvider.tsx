import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useSession } from './SessionProvider';
import { acceptTrainingProgram, loadTrainingProgram, startTrainingProgram, type TrainingProgram } from '@/services/trainingProgram';
import { readTrainingProgramCache, writeTrainingProgramCache } from '@/storage/trainingProgram';

type ContextValue = {
  program: TrainingProgram | null;
  hydrated: boolean;
  refreshing: boolean;
  starting: boolean;
  accepting: boolean;
  error: string | null;
  acceptError: string | null;
  refresh: () => Promise<TrainingProgram | null>;
  start: (retry?: boolean) => Promise<TrainingProgram | null>;
  accept: () => Promise<boolean>;
};

const TrainingProgramContext = createContext<ContextValue | null>(null);

function fingerprint(program: TrainingProgram | null) {
  if (!program) return 'empty';
  return JSON.stringify({
    proposalId: program.proposalId,
    acceptedAt: program.acceptedAt,
    status: program.status,
    phase: program.phase,
    sourceRevision: program.sourceRevision,
    stale: program.stale,
    error: program.error,
    updatedAt: program.updatedAt,
  });
}

export function TrainingProgramProvider({ children }: PropsWithChildren) {
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const current = useRef<TrainingProgram | null>(null);
  const account = useRef(userId);
  const epoch = useRef(0);
  const request = useRef<{ userId: string; promise: Promise<TrainingProgram | null> } | null>(null);
  const actionBusy = useRef(false);
  account.current = userId;

  const publish = useCallback(async (owner: string, next: TrainingProgram | null) => {
    if (account.current !== owner) return current.current;
    if (fingerprint(current.current) === fingerprint(next)) return current.current;
    current.current = next;
    setProgram(next);
    try { await writeTrainingProgramCache(owner, next); } catch {
      // The current screen keeps its data; a later refresh retries the local write.
    }
    return next;
  }, []);

  const refresh = useCallback(async (): Promise<TrainingProgram | null> => {
    if (!userId) return null;
    if (request.current?.userId === userId) return request.current.promise;
    const owner = userId;
    const version = epoch.current;
    setRefreshing(true);
    const pending = loadTrainingProgram().then(async next => {
      if (account.current !== owner || epoch.current !== version) return current.current;
      setError(null);
      return publish(owner, next);
    }).catch(error => {
      if (account.current === owner && epoch.current === version && !current.current) {
        setError(error instanceof Error ? error.message : 'Impossible de charger ton programme.');
      }
      return current.current;
    }).finally(() => {
      if (request.current?.promise === pending) request.current = null;
      if (account.current === owner) setRefreshing(false);
    });
    request.current = { userId: owner, promise: pending };
    return pending;
  }, [publish, userId]);

  const start = useCallback(async (retry = true): Promise<TrainingProgram | null> => {
    if (!userId || actionBusy.current) return current.current;
    actionBusy.current = true;
    const owner = userId;
    const version = epoch.current;
    setStarting(true); setError(null);
    try {
      const next = await startTrainingProgram(retry);
      if (account.current !== owner || epoch.current !== version) return current.current;
      return publish(owner, next);
    } catch (error) {
      if (account.current === owner && epoch.current === version) setError(error instanceof Error ? error.message : 'Impossible de lancer la génération.');
      return current.current;
    } finally {
      actionBusy.current = false;
      if (account.current === owner) setStarting(false);
    }
  }, [publish, userId]);

  const accept = useCallback(async () => {
    const active = current.current;
    if (!userId || !active || actionBusy.current) return false;
    actionBusy.current = true;
    const owner = userId;
    const version = epoch.current;
    setAccepting(true); setAcceptError(null);
    try {
      const next = await acceptTrainingProgram(active.proposalId);
      if (account.current !== owner || epoch.current !== version) return false;
      await publish(owner, next);
      return true;
    } catch (error) {
      if (account.current === owner && epoch.current === version) {
        setAcceptError(error instanceof Error ? error.message : 'Impossible de valider ton programme.');
        void refresh();
      }
      return false;
    } finally {
      actionBusy.current = false;
      if (account.current === owner) setAccepting(false);
    }
  }, [publish, refresh, userId]);

  useEffect(() => {
    const version = ++epoch.current;
    current.current = null;
    setProgram(null); setError(null); setAcceptError(null); setHydrated(false); setRefreshing(false);
    if (!userId) { setHydrated(true); return; }
    let alive = true;
    void (async () => {
      const cached = await readTrainingProgramCache(userId);
      if (!alive || account.current !== userId || epoch.current !== version) return;
      current.current = cached.program;
      setProgram(cached.program); setHydrated(true);
      void refresh();
    })().catch(() => {
      if (alive && account.current === userId) setHydrated(true);
    });
    return () => { alive = false; };
  }, [refresh, userId]);

  useEffect(() => {
    if (!userId || !program || !['queued', 'generating'].includes(program.status)) return;
    const timer = setTimeout(() => void refresh(), 2500);
    return () => clearTimeout(timer);
  }, [program?.phase, program?.status, program?.updatedAt, refresh, userId]);

  useEffect(() => {
    if (!userId) return;
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => listener.remove();
  }, [refresh, userId]);

  return <TrainingProgramContext.Provider value={{ program, hydrated, refreshing, starting, accepting, error, acceptError, refresh, start, accept }}>{children}</TrainingProgramContext.Provider>;
}

export function useTrainingProgramState() {
  const value = useContext(TrainingProgramContext);
  if (!value) throw new Error('TrainingProgramProvider missing');
  return value;
}
