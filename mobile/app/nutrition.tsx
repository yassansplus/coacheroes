import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { NutritionScreen } from '@/features/nutrition/screens/NutritionScreen';

export default function NutritionRoute() {
  const router = useRouter();
  const { action, from } = useLocalSearchParams<{ action?: string; from?: string }>();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><NutritionScreen key={action ?? 'home'} initialAdd={action === 'add'} onHome={() => { if ((from === 'game' || from === 'profile') && router.canGoBack()) router.back(); else router.dismissTo('/'); }} /></>;
}
