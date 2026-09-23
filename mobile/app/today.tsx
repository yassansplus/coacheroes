import { useLocalSearchParams, useRouter } from 'expo-router';

import { DailyCheckInScreen } from '@/features/daily-check-in/screens/DailyCheckInScreen';

export default function TodayRoute() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  return <DailyCheckInScreen onFinish={() => { if (from === 'game' && router.canGoBack()) router.back(); else router.dismissTo('/'); }} />;
}
