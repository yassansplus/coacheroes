import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/features/onboarding/screens/OnboardingScreen';

export default function IndexRoute() {
  const router = useRouter();
  return <OnboardingScreen onOpenLibrary={() => router.push('/components')} />;
}
