import { useRouter, type Href } from 'expo-router';

import { HomeScreen } from '@/features/home/screens/HomeScreen';

export default function IndexRoute() {
  const router = useRouter();
  const pending = (section: string) => router.push({ pathname: '/pending', params: { section } } as Href);
  return <HomeScreen
    onTab={tab => { if (tab === 'program') router.push('/program'); else if (tab === 'coach') router.push('/coach'); else if (tab === 'progress') router.push('/progression' as Href); else if (tab === 'profile') router.push('/profile' as Href); }}
    onWorkout={() => router.push({ pathname: '/program', params: { start: 'today' } })}
    onNutrition={() => router.push('/nutrition')}
    onAddMeal={() => router.push({ pathname: '/nutrition', params: { action: 'add' } })}
    onCheckIn={() => router.push('/today')}
    onNotifications={() => pending('notifications')}
    onMissions={() => pending('missions')}
    onSquad={() => pending('squad')}
  />;
}
