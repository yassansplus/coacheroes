import { useRouter } from 'expo-router';

import { ComponentLibraryScreen } from '@/features/component-library/screens/ComponentLibraryScreen';

export default function ComponentsRoute() {
  const router = useRouter();
  return <ComponentLibraryScreen onOpenOnboarding={() => router.dismissTo('/')} />;
}
