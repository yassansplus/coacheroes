import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ProgramScreen } from '@/features/program/screens/ProgramScreen';

export default function ProgramRoute() {
  const router = useRouter();
  const { start } = useLocalSearchParams<{ start?: string }>();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><ProgramScreen key={start ?? 'program'} initialPreparation={start === 'today'} onHome={() => router.dismissTo('/')} onToday={() => router.dismissTo('/')} onProgress={() => router.push('/progression' as Href)} onCoach={() => router.push('/coach')} onProfile={() => router.push('/profile' as Href)} /></>;
}
