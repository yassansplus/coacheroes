import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/BottomSheet';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ChatMessages } from '@/components/ChatMessages';
import { MessageComposer } from '@/components/MessageComposer';
import { TrainingProgramView } from '@/components/TrainingProgramView';
import { usePreparationChat } from '@/hooks/usePreparationChat';
import type { TrainingProgram } from '@/services/trainingProgram';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type Props = { program: TrainingProgram | null; loading: boolean; error: string | null; accepting: boolean; acceptError: string | null;
  onRetry: () => void; onRefresh: () => void; onAccept: () => void; onEditProfile?: () => void };
export function ProgramProposal(props: Props) {
  const ready = props.program?.status === 'ready' && !props.program.stale && !props.program.acceptedAt;
  return <View style={s.stack}>
    <TrainingProgramView program={props.program} loading={props.loading} error={props.error} onRetry={props.onRetry} onEditProfile={props.onEditProfile} />
    {ready && props.program ? <ReviewChat proposalId={props.program.proposalId} onRefresh={props.onRefresh} onAccept={props.onAccept} accepting={props.accepting} acceptError={props.acceptError} onEditProfile={props.onEditProfile} /> : null}
  </View>;
}
function ReviewChat({ proposalId, onRefresh, onAccept, accepting, acceptError, onEditProfile }: Pick<Props, 'onRefresh' | 'onAccept' | 'accepting' | 'acceptError' | 'onEditProfile'> & { proposalId: string }) {
  const chat = usePreparationChat('program_review');
  const [opened, setOpened] = useState(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  function close() { Keyboard.dismiss(); setOpened(false); }
  const scroll = useRef<ScrollView>(null);
  const conversation = chat.conversation;
  const waiting = chat.busy || conversation?.status === 'queued' || conversation?.status === 'processing';
  useEffect(() => { if (conversation?.proposalId && conversation.proposalId !== proposalId) onRefresh(); }, [conversation?.proposalId, proposalId, onRefresh]);
  return <View style={s.stack}>
    {waiting && !opened ? <Text style={s.body}>Ton coach s’en occupe…</Text> : null}
    {chat.error || conversation?.error ? <Banner variant="error" message={chat.error ?? conversation?.error ?? ''} /> : null}
    {acceptError ? <Banner variant="error" message={acceptError} /> : null}
    <View style={s.actions}>
      <Button text={accepting ? 'Validation…' : 'Valider'} accessibilityLabel="Valider mon programme" containerStyle={{ flex: 2, minWidth: 0 }} style={{ minHeight: 52 }} radius={16} leading={<Symbol name="check" color="white" size={18} />} onPress={onAccept} disabled={waiting || accepting || chat.retryPending || !conversation || !!chat.error || conversation.proposalId !== proposalId} />
      <IconButton accessibilityLabel="Discuter avec mon coach" variant="surface" size={52} style={s.actionIcon} icon={<Symbol name="sparkles" color="primary" />} onPress={() => setOpened(true)} disabled={accepting} />
      {onEditProfile ? <IconButton accessibilityLabel="Modifier mes disponibilités ou mon profil" variant="surface" size={52} style={s.actionIcon} icon={<Symbol name="calendar" color="primary" />} onPress={onEditProfile} disabled={waiting || accepting} /> : null}
    </View>
    <BottomSheet visible={opened} onClose={close} style={{ height: height * 0.82, maxHeight: '100%', flexShrink: 1, paddingBottom: Math.max(insets.bottom, 16) }} footer={
      <MessageComposer value={chat.draft} onChange={chat.setDraft} onSend={() => void chat.send()} placeholder="Une question ou un ajustement ?" disabled={waiting || accepting || chat.retryPending || conversation?.status !== 'awaiting_answer'} />
    }>
      <View style={s.row}><Text style={[s.title, { flex: 1 }]}>Ton coach</Text><IconButton accessibilityLabel="Fermer la discussion" variant="ghost" icon={<Symbol name="close" />} onPress={close} /></View>
      <ScrollView ref={scroll} style={{ flex: 1, minHeight: 0 }} contentContainerStyle={s.messages} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        onLayout={() => scroll.current?.scrollToEnd({ animated: false })} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        <ChatMessages messages={conversation?.messages ?? []} />
        {waiting ? <View style={s.row}><ActivityIndicator color={colors.primary} /><Text style={s.body}>Ton coach s’en occupe…</Text></View> : null}
        {chat.error || conversation?.error ? <><Banner variant="error" message={chat.error ?? conversation?.error ?? ''} /><Button text="Réessayer" variant="outline" onPress={chat.retry} disabled={waiting || accepting} /></> : null}
      </ScrollView>
    </BottomSheet>
  </View>;
}
const s = StyleSheet.create({ stack: { gap: 16, width: '100%' }, actions: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10 }, actionIcon: { flex: 1, width: undefined, minWidth: 48, borderRadius: 16 }, messages: { flexGrow: 1, gap: 16, paddingVertical: 12 }, row: { flexDirection: 'row', gap: 10, alignItems: 'center' }, title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 20 }, body: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 13 } });
