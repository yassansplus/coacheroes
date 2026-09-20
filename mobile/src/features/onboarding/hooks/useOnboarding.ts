import { useCallback, useState } from 'react';

import { updateProfileSummary } from '@/store/profileSummary';
import { createInitialProfile, foods, goals } from '../data';
import type { FoodInputs, FoodSection, OnboardingProfile } from '../types';
import { commitFoodInputs, setFoodSelections, validateStep } from '../utils';

let savedProfile: OnboardingProfile | null = null;

export function useOnboarding(editStep?: number, onSaved?: () => void) {
  const [profile, setProfile] = useState(() => savedProfile ?? (editStep ? {
    ...createInitialProfile(), age: '28', height: '177', weight: '78', goal: ['recomposition'] as OnboardingProfile['goal'],
  } : createInitialProfile()));
  const [step, setStep] = useState(editStep ?? 1);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [foodInputs, setFoodInputs] = useState<FoodInputs>({ liked: '', avoided: '' });
  const changeFoodInput = useCallback((section: FoodSection, values: string[], inputValue: string) => {
    setProfile(previous => ({ ...previous, ...setFoodSelections(previous, section, values, foods) }));
    setFoodInputs(previous => ({ ...previous, [section]: inputValue }));
  }, []);
  const update = useCallback((patch: Partial<OnboardingProfile>) => {
    setProfile(previous => ({ ...previous, ...patch })); setError(null);
  }, []);
  const next = useCallback(() => {
    const message = validateStep(step, profile);
    if (message) { setError(message); return; }
    const committed = { ...profile, ...(step === 12 ? commitFoodInputs(profile, foodInputs, foods) : {}),
      skippedSteps: profile.skippedSteps.filter(value => value !== step) };
    savedProfile = committed;
    setProfile(committed);
    updateProfileSummary({ ...(committed.age ? { age: committed.age } : {}), ...(committed.height ? { height: committed.height } : {}),
      ...(committed.goal.length ? { goals: goals.filter(goal => committed.goal.includes(goal.value)).map(goal => goal.title).join(' · ') } : {}) });
    if (step === 12) setFoodInputs({ liked: '', avoided: '' });
    setError(null);
    if (editStep) { onSaved?.(); return; }
    setStep(editingStep ? 14 : Math.min(16, step + 1));
    setEditingStep(null);
  }, [editStep, onSaved, editingStep, foodInputs, profile, step]);
  const back = useCallback(() => {
    setError(null);
    if (completed) { setCompleted(false); return; }
    if (step === 12) {
      setProfile(previous => ({ ...previous, ...commitFoodInputs(previous, foodInputs, foods) }));
      setFoodInputs({ liked: '', avoided: '' });
    }
    setStep(editingStep ? 14 : step >= 15 ? 14 : Math.max(1, step - 1));
    setEditingStep(null);
  }, [completed, editingStep, foodInputs, step]);
  const skip = useCallback(() => {
    setProfile(previous => ({ ...previous, skippedSteps: [...new Set([...previous.skippedSteps, step])] }));
    setError(null); setStep(editingStep ? 14 : step + 1); setEditingStep(null);
  }, [editingStep, step]);
  const edit = useCallback((target: number) => { setError(null); setEditingStep(target); setStep(target); }, []);
  const generationDone = useCallback(() => setStep(16), []);
  const review = useCallback(() => { setCompleted(false); setEditingStep(null); setError(null); setStep(14); }, []);
  return { profile, step, update, next, back, skip, edit, error, editingStep, completed,
    foodInputs, changeFoodInput,
    finish: () => setCompleted(true), generationDone, review };
}
