import { DailyProvider } from './DailyProvider';
import { SessionProvider } from './SessionProvider';
import { TrainingProgramProvider } from './TrainingProgramProvider';
import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export function AppProviders({ children }: PropsWithChildren) {
  return <SafeAreaProvider><SessionProvider><TrainingProgramProvider><DailyProvider>{children}</DailyProvider></TrainingProgramProvider></SessionProvider></SafeAreaProvider>;
}
