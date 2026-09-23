import { AppState } from 'react-native';
import { syncWorkouts } from '@/services/workouts';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { appleSignIn } from '@/services/appleSignIn';
import { apiRequest, ApiError, setUnauthorizedHandler } from '@/services/http';
import { restoreSessionToken, storeSessionToken } from '@/storage/session';
import { clearPhotoCache } from '@/storage/photos';
import { resetHomeNutritionSummary } from '@/store/homeSummary';
export type SessionUser = { id: string; firstName: string | null; email: string | null; createdAt: string; onboardingCompleted: boolean };
type SessionContextValue = {
  user: SessionUser | null; loading: boolean; busy: boolean; error: string | null;
  signIn: () => Promise<void>; signOut: () => Promise<void>; restore: () => Promise<void>; refresh: () => Promise<void>;
};
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const working = useRef(false);
  const refresh = useCallback(async () => { setUser(await apiRequest<SessionUser>('/auth/me')); }, []);
  const restore = useCallback(async () => {
    setLoading(true); setError(null);
    try { if (await restoreSessionToken()) await refresh(); }
    catch (e) {
      if (e instanceof ApiError && e.status === 401) { await storeSessionToken(null); setUser(null); }
      else setError(e instanceof Error ? e.message : 'Impossible de restaurer la session.');
    } finally { setLoading(false); }
  }, [refresh]);
  useEffect(() => {
    setUnauthorizedHandler(() => { setUser(null); resetHomeNutritionSummary(); void storeSessionToken(null).catch(() => {}); void clearPhotoCache().catch(() => {}); });
    void restore();
    return () => setUnauthorizedHandler(undefined);
  }, [restore]);
  useEffect(()=>{if(!user)return;const sync=()=>{void syncWorkouts(user.id).catch(()=>{});};sync();const timer=setInterval(sync,15000);const listener=AppState.addEventListener('change',state=>{if(state==='active')sync();});return()=>{clearInterval(timer);listener.remove();};},[user?.id]);
  const signIn = useCallback(async () => {
    if (working.current) return;
    working.current = true; setBusy(true); setError(null);
    try { const result = await appleSignIn(); if (result) { await storeSessionToken(result.token); await refresh(); } }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossible de te connecter.'); }
    finally { working.current = false; setBusy(false); }
  }, [refresh]);
  const signOut = useCallback(async () => {
    if (working.current) return;
    working.current = true; setBusy(true); setError(null);
    try { await apiRequest('/auth/logout', { method: 'POST' }); await storeSessionToken(null); setUser(null); resetHomeNutritionSummary(); await clearPhotoCache(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossible de te déconnecter.'); }
    finally { working.current = false; setBusy(false); }
  }, []);
  return <SessionContext.Provider value={{ user, loading, busy, error, signIn, signOut, restore, refresh }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider missing');
  return value;
}
