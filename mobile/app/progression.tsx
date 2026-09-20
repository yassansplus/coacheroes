import { Stack, useRouter, type Href } from 'expo-router';
import { ProgressionScreen } from '@/features/progression/screens/ProgressionScreen';

export default function ProgressionRoute() {
  const router = useRouter();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><ProgressionScreen onHome={() => router.dismissTo('/')} onToday={() => router.dismissTo('/')} onProgram={() => router.push('/program')} onCoach={() => router.push('/coach')} onProfile={() => router.push('/profile' as Href)} /></>;
}
