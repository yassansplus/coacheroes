import { Redirect, useGlobalSearchParams, usePathname } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { useSession } from './SessionProvider';
export function SessionGate({ children }: PropsWithChildren) {
  const session = useSession();
  const focused = useIsFocused();
  const pathname = usePathname();
  const { edit } = useGlobalSearchParams();
  if (!focused) return null;
  if (pathname === '/components') return children;
  if (session.loading) return <View style={{ flex: 1, justifyContent: 'center' }}><LoadingState label="Ouverture de ton compte…" /></View>;
  if (session.error && !session.user && pathname !== '/onboarding')
    return <View style={{ flex: 1, justifyContent: 'center' }}><ErrorState description={session.error} onRetry={() => void session.restore()} /></View>;
  if (!session.user?.onboardingCompleted && pathname === '/onboarding' && edit) return <Redirect href="/onboarding" />;
  if ((!session.user || !session.user.onboardingCompleted) && pathname !== '/onboarding') return <Redirect href="/onboarding" />;
  if (session.user?.onboardingCompleted && pathname === '/onboarding' && !edit) return <Redirect href="/" />;
  return children;
}
