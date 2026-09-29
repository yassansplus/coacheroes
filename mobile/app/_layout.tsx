import { Stack } from 'expo-router';
import { AppBootstrap } from '@/providers/AppBootstrap';
import { SessionGate } from '@/providers/SessionGate';
import { colors } from '@/theme/colors';

export default function RootLayout() {
  return <AppBootstrap>
    <Stack screenLayout={({ children }) => <SessionGate>{children}</SessionGate>}
      screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShown: false }} />
  </AppBootstrap>;
}
