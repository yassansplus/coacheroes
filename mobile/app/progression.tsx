import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ProgressionScreen } from '@/features/progression/screens/ProgressionScreen';

export default function ProgressionRoute() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><ProgressionScreen onExit={from === 'game' ? () => { if (router.canGoBack()) router.back(); else router.replace('/game' as Href); } : undefined} onHome={() => router.dismissTo('/')} onToday={() => router.dismissTo('/')} onProgram={() => router.push('/program')} onCoach={() => router.push('/coach')} onProfile={() => router.push('/profile' as Href)} /></>;
}
