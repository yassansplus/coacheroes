import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';

import { Banner } from '@/components/Banner';
import { ProgramProposal } from '@/components/ProgramProposal';
import { useTrainingProgram } from '@/hooks/useTrainingProgram';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useSession } from '@/providers/SessionProvider';
import { MeasurementsStep } from '../components/MeasurementsStep';
import { EatingHabitsStep, FoodPreferencesStep } from '../components/NutritionSteps';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { GoalStep, LevelStep, ProfileStep } from '../components/ProfileSteps';
import { DailyLifeStep, PainStep } from '../components/RecoverySteps';
import { ReviewStep } from '../components/ReviewStep';
import { stepStyles } from '../components/StepContent';
import { AvailabilityStep, EquipmentStep, PerformanceStep, SportsStep } from '../components/TrainingSteps';
import { WelcomeStep } from '../components/WelcomeStep';
import { useOnboarding } from '../hooks/useOnboarding';

export function OnboardingScreen({ onOpenLibrary, onFinish, editStep, onCloseEdit }: { onOpenLibrary: () => void; onFinish: () => void; editStep?: number; onCloseEdit?: () => void }) {
  const session = useSession();
  const flow = useOnboarding(editStep, onCloseEdit);
  const generation = useTrainingProgram(flow.step === 16 && !editStep, true);
  const goBack = editStep && onCloseEdit ? onCloseEdit : flow.step === 16 ? () => void flow.reload(14) : flow.back;
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [profileFocus, setProfileFocus] = useState<{ field: 'age' | 'height' | 'weight'; request: number } | null>(null);
  const props = { profile: flow.profile, update: flow.update };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (flow.step === 1) return false;
      if (flow.busy || flow.retryPending || flow.conflict) return true;
      goBack(); return true;
    });
    return () => subscription.remove();
  }, [goBack, flow.step, flow.busy, flow.retryPending, flow.conflict]);
  function start() { void session.signIn(); }
  async function finish() {
    setFinishError(null);
    try { await session.refresh(); onFinish(); }
    catch (e) { setFinishError(e instanceof Error ? e.message : 'Impossible d’ouvrir ton compte.'); }
  }
  const next = useCallback(() => {
    if (flow.step === 3) {
      const field = (['age', 'height', 'weight'] as const).find(key => !flow.profile[key].trim());
      if (field) {
        setProfileFocus(current => ({ field, request: (current?.request ?? 0) + 1 }));
        return;
      }
    }
    flow.next();
  }, [flow.next, flow.profile, flow.step]);
  function renderStep() {
    switch (flow.step) {
      case 1: return <><WelcomeStep busy={session.busy} onStart={start} onLogin={start} onOpenLibrary={onOpenLibrary} />{session.error ? <Banner variant="error" message={session.error} /> : null}</>;
      case 2: return <GoalStep {...props} />;
      case 3: return <ProfileStep {...props} focusField={profileFocus?.field} focusRequest={profileFocus?.request} />;
      case 4: return <LevelStep {...props} />;
      case 5: return <PerformanceStep {...props} />;
      case 6: return <SportsStep {...props} />;
      case 7: return <AvailabilityStep {...props} />;
      case 8: return <EquipmentStep {...props} />;
      case 9: return <PainStep {...props} />;
      case 10: return <DailyLifeStep {...props} />;
      case 11: return <EatingHabitsStep {...props} />;
      case 12: return <FoodPreferencesStep {...props} foodInputs={flow.foodInputs} onFoodChange={flow.changeFoodInput} />;
      case 13: return <MeasurementsStep {...props} />;
      case 14: return <ReviewStep profile={flow.profile} onEdit={flow.edit} />;
      case 16: return <ProgramProposal {...generation} onRetry={() => void generation.start()} onRefresh={generation.refresh} onAccept={() => { void generation.accept().then(ok => { if (ok) void finish(); }); }} onEditProfile={() => void flow.reload(14)} />;
    }
  }
  if (session.loading || flow.loading) return <LoadingState label="Chargement de tes réponses…" />;
  if (flow.loadFailed) return <ErrorState description={flow.error ?? undefined} onRetry={() => void flow.reload()} />;
  if (flow.conflict) return <ErrorState title="Ton profil a été modifié ailleurs" description={flow.error ?? undefined} retryLabel="Recharger les réponses enregistrées" onRetry={() => void flow.reload()} />;
  return <>
    <OnboardingLayout step={flow.step === 16 && (generation.program?.status === 'queued' || generation.program?.status === 'generating') ? 15 : flow.step} editing={Boolean(editStep)} completed={flow.step === 16 && generation.program?.status === 'ready'} onBack={goBack} error={flow.error ?? finishError}
      contentStyle={[7, 10, 11].includes(flow.step) ? { gap: 12, paddingTop: 8 } : undefined}
      busy={flow.busy} locked={flow.retryPending}
      onNext={flow.step === 1 ? undefined : flow.step === 16 ? generation.program?.acceptedAt ? () => void finish() : undefined : next}
      nextLabel={flow.busy ? 'Enregistrement…' : flow.retryPending ? 'Réessayer l’enregistrement' : editStep || flow.editingStep ? 'Enregistrer les modifications' : flow.step === 14 ? 'Créer mon programme' : flow.step === 16 ? 'Accéder à mon compte' : 'Continuer'}
      onSkip={!editStep && [5, 7, 8, 10].includes(flow.step) ? flow.skip : undefined}
      onOptions={flow.step === 11 ? () => setOptionsVisible(true) : undefined}
>
      {renderStep()}
    </OnboardingLayout>
    <BottomSheet visible={optionsVisible} onClose={() => setOptionsVisible(false)} title="Tes habitudes, à ton rythme">
      <View style={stepStyles.stack}><Text style={stepStyles.body}>Ces réponses permettent de comprendre ton quotidien. Tu peux les modifier depuis le récapitulatif avant de créer ton programme.</Text>
        <Button text="Compris" onPress={() => setOptionsVisible(false)} /></View>
    </BottomSheet>
  </>;
}
