import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SquadScreen } from '@/features/squad/screens/SquadScreen';

export default function SquadRoute() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><SquadScreen
    onClose={() => router.dismissTo((from === 'profile' ? '/profile' : '/') as Href)}
    onProgram={() => router.push({ pathname: '/program', params: { from: 'squad' } })}
  /></>;
}
