import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProgramRenewalScreen } from '@/features/program/screens/ProgramRenewalScreen';
export default function ProgramRenewalRoute() {
  const router = useRouter(); const { blockId } = useLocalSearchParams<{ blockId: string }>();
  return <ProgramRenewalScreen blockId={blockId} onBack={() => router.back()} onDone={() => router.replace('/program')} />;
}
