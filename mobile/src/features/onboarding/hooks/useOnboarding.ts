import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '@/providers/SessionProvider';
import { ApiError } from '@/services/http';
import { cachePhoto, uploadPhoto } from '@/storage/photos';
import { loadOnboarding, saveOnboarding, type SaveRequest } from '../api/onboarding';
import { createInitialProfile, foods } from '../data';
import type { FoodInputs, FoodSection, OnboardingProfile } from '../types';
import { commitFoodInputs, setFoodSelections, validateStep } from '../utils';

type PendingSave = { request: SaveRequest; complete: boolean; local: OnboardingProfile; destination: number; closeEdit: boolean };
export function useOnboarding(editStep?: number, onSaved?: () => void) {
  const { user } = useSession();
  const userId = user?.id;
  const [profile, setProfile] = useState(createInitialProfile);
  const [step, setStep] = useState(1);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [foodInputs, setFoodInputs] = useState<FoodInputs>({ liked: '', avoided: '' });
  const revision = useRef(0);
  const working = useRef(false);
  const epoch = useRef(0);
  const photoIds = useRef(new Map<string, string>());
  const pending = useRef<PendingSave | null>(null);
  const reload = useCallback(async (destination?: number) => {
    const current = ++epoch.current;
    pending.current = null; working.current = false;
    setBusy(false); setError(null); setRetryPending(false); setConflict(false); setLoadFailed(false);
    setEditingStep(null); setFoodInputs({ liked: '', avoided: '' });
    photoIds.current.clear();
    if (!userId) { setProfile(createInitialProfile()); setStep(1); setLoading(false); return; }
    setLoading(true);
    try {
      const saved = await loadOnboarding();
      const photos: OnboardingProfile['photos'] = {};
      const entries = new Map<string, string>();
      for (const [view, id] of Object.entries(saved.profile.photos ?? {})) {
        if (!id) continue;
        const uri = await cachePhoto(userId, id);
        photos[view as keyof typeof photos] = uri;
        entries.set(uri, id);
      }
      if (epoch.current !== current) return;
      photoIds.current = entries;
      revision.current = saved.revision;
      setProfile({ ...createInitialProfile(), ...saved.profile, photos });
      setStep(destination ?? editStep ?? (saved.completedAt ? 16 : saved.currentStep));
    } catch (e) {
      if (epoch.current === current) { setError(e instanceof Error ? e.message : 'Impossible de charger ton profil.'); setLoadFailed(true); }
    } finally { if (epoch.current === current) setLoading(false); }
  }, [userId, editStep]);
  useEffect(() => { void reload(); return () => { epoch.current++; }; }, [reload]);
  const update = useCallback((patch: Partial<OnboardingProfile>) => {
    if (working.current || pending.current) return;
    setProfile(previous => ({ ...previous, ...patch })); setError(null);
  }, []);
  const changeFoodInput = useCallback((section: FoodSection, values: string[], inputValue: string) => {
    if (working.current || pending.current) return;
    setProfile(previous => ({ ...previous, ...setFoodSelections(previous, section, values, foods) }));
    setFoodInputs(previous => ({ ...previous, [section]: inputValue }));
  }, []);
  const persist = useCallback(async (local: OnboardingProfile, destination: number, complete = false, closeEdit = false) => {
    if (working.current || !userId || conflict) return;
    const current = epoch.current;
    working.current = true; setBusy(true); setError(null);
    try {
      if (!pending.current) {
        const photos: OnboardingProfile['photos'] = {};
        for (const [view, uri] of Object.entries(local.photos)) {
          if (!uri) continue;
          const id = photoIds.current.get(uri) ?? await uploadPhoto(uri);
          photoIds.current.set(uri, id); photos[view as keyof typeof photos] = id;
        }
        if (epoch.current !== current) return;
        pending.current = { local, destination, complete, closeEdit, request: {
          profile: { ...local, photos }, currentStep: closeEdit ? 14 : Math.min(14, destination),
          revision: revision.current, requestId: Crypto.randomUUID(), occurredAt: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        } };
      }
      const operation = pending.current;
      const saved = await saveOnboarding(operation.request, operation.complete);
      if (epoch.current !== current) return;
      revision.current = saved.revision;
      pending.current = null; setRetryPending(false);
      setProfile(operation.local); setFoodInputs({ liked: '', avoided: '' }); setEditingStep(null);
      if (operation.closeEdit) onSaved?.(); else setStep(operation.destination);
    } catch (e) {
      if (epoch.current !== current) return;
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer.');
      if (e instanceof ApiError && e.status === 409) { setConflict(true); pending.current = null; }
      else if (e instanceof ApiError && e.status >= 400 && e.status < 500) { pending.current = null; setRetryPending(false); }
      else setRetryPending(Boolean(pending.current));
    } finally { if (epoch.current === current) { working.current = false; setBusy(false); } }
  }, [userId, conflict, onSaved]);
  const committedProfile = () => ({ ...profile, ...commitFoodInputs(profile, foodInputs, foods) });
  const next = () => {
    if (pending.current) { void persist(profile, step); return; }
    const committed = committedProfile();
    const message = validateStep(step, committed);
    if (message) { setError(message); return; }
    committed.skippedSteps = committed.skippedSteps.filter(value => value !== step);
    void persist(committed, step === 14 ? 16 : editingStep ? 14 : step + 1, step === 14, Boolean(editStep));
  };
  const back = () => {
    if (working.current || pending.current || conflict) return;
    if (step === 16) { setStep(14); return; }
    void persist(committedProfile(), editingStep ? 14 : Math.max(2, step - 1));
  };
  const skip = () => {
    if (pending.current) return;
    void persist({ ...committedProfile(), skippedSteps: [...new Set([...profile.skippedSteps, step])] }, editingStep ? 14 : step + 1);
  };
  const edit = (target: number) => { if (!working.current && !pending.current && !conflict) { setError(null); setEditingStep(target); setStep(target); } };
  return { profile, step, update, next, back, skip, edit, error, editingStep,
    loading, loadFailed, busy, retryPending, conflict, reload, foodInputs, changeFoodInput };
}
