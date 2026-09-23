import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { GeneratedProgramScreen } from '@/features/program/screens/GeneratedProgramScreen';
export default function ProgramRoute() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const onExit = from === 'squad' || from === 'game' ? () => {
    if (router.canGoBack()) router.back(); else router.replace((from === 'game' ? '/game' : '/squad') as Href);
  } : undefined;
  return <><Stack.Screen options={{ gestureEnabled: false }} /><GeneratedProgramScreen onExit={onExit} onHome={() => router.dismissTo('/')} onProgress={() => router.push('/progression' as Href)} onCoach={() => router.push('/coach')} onProfile={() => router.push('/profile' as Href)} onEditProfile={() => router.push('/onboarding?edit=14' as Href)} /></>;
}
