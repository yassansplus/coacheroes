import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SquadScreen } from '@/features/squad/screens/SquadScreen';

export default function SquadInviteRoute() {
  const router = useRouter();
  const { token, from } = useLocalSearchParams<{ token?: string; from?: string }>();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><SquadScreen initialToken={token}
    onClose={() => router.replace((from === 'onboarding' ? '/program' : '/') as Href)}
    onProgram={() => router.push('/program' as Href)} /></>;
}
