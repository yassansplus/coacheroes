import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { OnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';

export default function OnboardingRoute() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editStep = [2, 3, 6, 7, 12].includes(Number(edit)) ? Number(edit) : undefined;
  return <OnboardingScreen key={editStep ?? 'onboarding'} editStep={editStep} onCloseEdit={() => router.dismissTo('/profile' as Href)} onOpenLibrary={() => router.dismissTo('/components')} />;
}
