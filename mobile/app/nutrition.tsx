import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { NutritionScreen } from '@/features/nutrition/screens/NutritionScreen';

export default function NutritionRoute() {
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action?: string }>();
  return <><Stack.Screen options={{ gestureEnabled: false }} /><NutritionScreen key={action ?? 'home'} initialAdd={action === 'add'} onHome={() => router.dismissTo('/')} /></>;
}
