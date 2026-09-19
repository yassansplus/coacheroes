import { useCallback, useEffect, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';

import { AppModal } from '@/components/AppModal';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Toast } from '@/components/Toast';

import { GenerationStep } from '../components/GenerationStep';
import { MeasurementsStep } from '../components/MeasurementsStep';
import { EatingHabitsStep, FoodPreferencesStep } from '../components/NutritionSteps';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { GoalStep, LevelStep, ProfileStep } from '../components/ProfileSteps';
import { ProgramStep } from '../components/ProgramStep';
import { DailyLifeStep, PainStep } from '../components/RecoverySteps';
import { ReviewStep } from '../components/ReviewStep';
import { stepStyles } from '../components/StepContent';
import { AvailabilityStep, EquipmentStep, PerformanceStep, SportsStep } from '../components/TrainingSteps';
import { WelcomeStep } from '../components/WelcomeStep';
import { useOnboarding } from '../hooks/useOnboarding';

export function OnboardingScreen({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const flow = useOnboarding();
  const [loginVisible, setLoginVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [demoNotice, setDemoNotice] = useState(false);
  const hideDemoNotice = useCallback(() => setDemoNotice(false), []);
  const props = { profile: flow.profile, update: flow.update };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (flow.step === 1) return false;
      flow.back(); return true;
    });
    return () => subscription.remove();
  }, [flow.back, flow.step]);
  function start() { setLoginVisible(false); flow.next(); setDemoNotice(true); }
  function renderStep() {
    switch (flow.step) {
      case 1: return <WelcomeStep onStart={start} onLogin={() => setLoginVisible(true)} onOpenLibrary={onOpenLibrary} />;
      case 2: return <GoalStep {...props} />;
      case 3: return <ProfileStep {...props} />;
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
      case 15: return <GenerationStep onDone={flow.generationDone} />;
      case 16: return <ProgramStep profile={flow.profile} completed={flow.completed} detailVisible={detailVisible}
        onCloseDetail={() => setDetailVisible(false)} onEdit={flow.review} onOpenLibrary={onOpenLibrary} />;
    }
  }
  return <>
    <OnboardingLayout step={flow.step} completed={flow.completed} onBack={flow.back} error={flow.error}
      contentStyle={[7, 10, 11].includes(flow.step) ? { gap: 12, paddingTop: 8 } : undefined}
      onNext={flow.step === 1 || flow.step === 15 || flow.completed ? undefined : flow.step === 16 ? flow.finish : flow.next}
      nextLabel={flow.editingStep ? 'Enregistrer les modifications' : flow.step === 14 ? 'Créer mon programme' : flow.step === 16 ? 'Commencer' : 'Continuer'}
      onSkip={[5, 7, 8, 10].includes(flow.step) ? flow.skip : undefined}
      onOptions={flow.step === 11 ? () => setOptionsVisible(true) : undefined}
      footer={flow.step === 16 && !flow.completed ? <Button text="Voir le détail" variant="outline" onPress={() => setDetailVisible(true)} style={{ minHeight: 49 }} /> : undefined}>
      {renderStep()}
    </OnboardingLayout>
    <AppModal visible={loginVisible} onClose={() => setLoginVisible(false)} title="Ravi de te retrouver !"
      actions={<Button text="Découvrir le parcours" onPress={start} />}>
      <Text style={stepStyles.body}>La connexion à ton compte sera disponible prochainement. Tu peux déjà découvrir l’onboarding et préparer ton profil dans cet aperçu.</Text>
    </AppModal>
    <BottomSheet visible={optionsVisible} onClose={() => setOptionsVisible(false)} title="Tes habitudes, à ton rythme">
      <View style={stepStyles.stack}><Text style={stepStyles.body}>Ces réponses permettent de comprendre ton quotidien. Tu peux les modifier depuis le récapitulatif avant de créer ton programme.</Text>
        <Button text="Compris" onPress={() => setOptionsVisible(false)} /></View>
    </BottomSheet>
    <Toast visible={demoNotice} onHide={hideDemoNotice} message="Mode aperçu · aucune connexion effectuée." variant="info" />
  </>;
}
