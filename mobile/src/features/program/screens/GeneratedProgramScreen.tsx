import { ProgramScreen } from './ProgramScreen';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { AppNavbar } from '@/components/AppNavbar';
import { IconButton } from '@/components/IconButton';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { ProgramProposal } from '@/components/ProgramProposal';
import { useTrainingProgram } from '@/hooks/useTrainingProgram';
import { colors } from '@/theme/colors';
export function GeneratedProgramScreen({ onHome, onProgress, onCoach, onProfile, onEditProfile, onExit }: {
  onHome: () => void; onProgress: () => void; onCoach: () => void; onProfile: () => void; onEditProfile: () => void; onExit?: () => void;
}) {
  const flow = useTrainingProgram();
  if (flow.program?.acceptedAt && flow.program.status === 'ready' && !flow.program.stale) return <ProgramScreen key={flow.program.proposalId} program={flow.program} onExit={onExit} onHome={onHome} onToday={onHome} onProgress={onProgress} onCoach={onCoach} onProfile={onProfile} />;
  return <View style={s.screen}><ScreenBackdrop /><SafeAreaView style={s.safe}><KeyboardAvoidingView style={s.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <AppHeader title="Mon programme" leading={<IconButton accessibilityLabel="Retour" icon={<Symbol name="back" />} onPress={onExit ?? onHome} />} />
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <ProgramProposal {...flow} onRetry={() => void flow.start()} onRefresh={flow.refresh} onAccept={() => void flow.accept()} onEditProfile={onEditProfile} />
    </ScrollView>
    <AppNavbar includeCoach value="program" onChange={value => {
      if (value === 'today') onHome(); else if (value === 'progress') onProgress(); else if (value === 'coach') onCoach(); else if (value === 'profile') onProfile();
    }} />
  </KeyboardAvoidingView></SafeAreaView></View>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, safe: { flex: 1 },
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18 }, content: { paddingVertical: 16 } });
