import { useRouter } from 'expo-router';

import { DailyCheckInScreen } from '@/features/daily-check-in/screens/DailyCheckInScreen';

export default function TodayRoute() {
  const router = useRouter();
  return <DailyCheckInScreen onFinish={() => router.dismissTo('/')} />;
}
