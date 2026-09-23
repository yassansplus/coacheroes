import { useRouter, type Href } from 'expo-router';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';

export default function ProfileRoute() {
  const router = useRouter();
  return <ProfileScreen
    onTab={tab => {
      if (tab === 'today') router.dismissTo('/');
      else if (tab === 'program') router.push('/program');
      else if (tab === 'coach') router.push('/coach');
      else if (tab === 'progress') router.push('/progression' as Href);
    }}
    onEdit={step => router.push({ pathname: '/onboarding', params: { edit: String(step) } })}
    onLevel={() => router.push('/game?from=profile' as Href)}
    onNutrition={() => router.push({ pathname: '/nutrition', params: { from: 'profile' } })}
    onLibrary={() => router.push('/components')}
    onSquad={() => router.push({ pathname: '/squad', params: { from: 'profile' } } as Href)}
  />;
}
