import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { GameScreen } from '@/features/game/screens/GameScreen';

export default function GameRoute() {
  const router = useRouter();
  const { page, from } = useLocalSearchParams<{ page?: string; from?: string }>();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><GameScreen key={page ?? 'level'} initialPage={page === 'daily' ? 'daily' : 'level'}
    onClose={() => router.dismissTo((from === 'profile' ? '/profile' : '/') as Href)}
    onDestination={destination => router.push({ pathname: destination === 'checkin' ? '/today' : destination === 'progression' ? '/progression' : destination === 'nutrition' ? '/nutrition' : '/program', params: { from: 'game' } } as Href)}
  /></>;
}
