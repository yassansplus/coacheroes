import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { ComponentLibraryScreen } from '@/features/component-library/screens/ComponentLibraryScreen';
import { SplashPreviewScreen } from '@/features/component-library/screens/SplashPreviewScreen';
import { BadgesPreviewScreen } from '@/features/component-library/screens/BadgesPreviewScreen';

export default function ComponentsRoute() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  if (preview === 'splash') return <SplashPreviewScreen onClose={() => router.canGoBack() ? router.back() : router.replace('/components')} />;
  if (preview === 'badges') return <BadgesPreviewScreen onClose={() => router.canGoBack() ? router.back() : router.replace('/components')} />;
  return <ComponentLibraryScreen onOpenOnboarding={() => router.push('/onboarding')} onOpenDailyCheckIn={() => router.push('/today')} onOpenProgram={() => router.push('/program')} onOpenNutrition={() => router.push('/nutrition')} onOpenCoach={() => router.push('/coach')} onOpenProgression={() => router.push('/progression' as Href)} onOpenSplash={() => router.push({ pathname: '/components', params: { preview: 'splash' } })} onOpenBadges={() => router.push({ pathname: '/components', params: { preview: 'badges' } })} />;
}
