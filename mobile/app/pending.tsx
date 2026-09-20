import { useLocalSearchParams, useRouter } from 'expo-router';
import { PendingScreen } from '@/features/home/screens/PendingScreen';

export default function PendingRoute() {
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const titles: Record<string, string> = { notifications: 'Notifications', missions: 'Missions', squad: 'Squad', profile: 'Profil' };
  return <PendingScreen title={titles[section ?? ''] ?? ''} onBack={() => router.dismissTo('/')} />;
}
