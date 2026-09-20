import { useRouter, type Href } from 'expo-router';

import { ComponentLibraryScreen } from '@/features/component-library/screens/ComponentLibraryScreen';

export default function ComponentsRoute() {
  const router = useRouter();
  return <ComponentLibraryScreen onOpenOnboarding={() => router.push('/onboarding')} onOpenDailyCheckIn={() => router.push('/today')} onOpenProgram={() => router.push('/program')} onOpenNutrition={() => router.push('/nutrition')} onOpenCoach={() => router.push('/coach')} onOpenProgression={() => router.push('/progression' as Href)} />;
}
