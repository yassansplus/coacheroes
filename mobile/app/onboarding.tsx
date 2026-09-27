import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { OnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';

export default function OnboardingRoute() {
  const router = useRouter();
  const { edit, invite } = useLocalSearchParams<{ edit?: string; invite?: string }>();
  const editStep = Array.from({ length: 13 }, (_, i) => i + 2).includes(Number(edit)) ? Number(edit) : undefined;
  return <OnboardingScreen key={editStep ?? 'onboarding'} editStep={editStep}
    onFinish={() => router.replace((invite ? `/squad/invite?token=${encodeURIComponent(invite)}&from=onboarding` : '/program') as Href)}
    onCloseEdit={() => router.dismissTo('/profile' as Href)} onOpenLibrary={() => router.push('/components')} />;
}
