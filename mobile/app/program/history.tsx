import { useRouter } from 'expo-router';
import { ProgramHistoryScreen } from '@/features/program/screens/ProgramHistoryScreen';
export default function ProgramHistoryRoute() { const router = useRouter(); return <ProgramHistoryScreen onBack={() => router.back()} />; }
