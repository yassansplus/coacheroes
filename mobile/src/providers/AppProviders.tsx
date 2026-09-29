import { useLanguage } from '@/i18n/useLanguage';
import { DailyProvider } from './DailyProvider';
import { GameProvider } from './GameProvider';
import { SessionProvider } from './SessionProvider';
import { TrainingProgramProvider } from './TrainingProgramProvider';
import { HomeWidgetSync } from './HomeWidgetSync';
import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export function AppProviders({ children }: PropsWithChildren) {
  useLanguage();
  return <SafeAreaProvider><SessionProvider><GameProvider><TrainingProgramProvider><DailyProvider><HomeWidgetSync />{children}</DailyProvider></TrainingProgramProvider></GameProvider></SessionProvider></SafeAreaProvider>;
}
