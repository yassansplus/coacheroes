import { useCallback, useState } from 'react';

import { createInitialProfile, foods } from '../data';
import type { FoodInputs, FoodSection, OnboardingProfile } from '../types';
import { commitFoodInputs, setFoodSelections, validateStep } from '../utils';

export function useOnboarding() {
  const [profile, setProfile] = useState(createInitialProfile);
  const [step, setStep] = useState(1);
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
    setProfile(previous => ({ ...previous, ...(step === 12 ? commitFoodInputs(previous, foodInputs, foods) : {}),
      skippedSteps: previous.skippedSteps.filter(value => value !== step) }));
    if (step === 12) setFoodInputs({ liked: '', avoided: '' });
    setError(null);
    setStep(editingStep ? 14 : Math.min(16, step + 1));
    setEditingStep(null);
  }, [editingStep, foodInputs, profile, step]);
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
