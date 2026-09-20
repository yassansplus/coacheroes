import { Stack, useRouter, type Href } from 'expo-router';
import { CoachScreen } from '@/features/coach/screens/CoachScreen';

export default function CoachRoute() {
  const router = useRouter();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><CoachScreen onHome={() => router.dismissTo('/')} onProgram={() => router.push('/program')} onToday={() => router.dismissTo('/')} onNutrition={() => router.push('/nutrition')} onProgress={() => router.push('/progression' as Href)} onProfile={() => router.push('/profile' as Href)} /></>;
}
