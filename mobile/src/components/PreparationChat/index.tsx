import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ChatMessages } from '@/components/ChatMessages';
import { LoadingState } from '@/components/LoadingState';
import { MessageComposer } from '@/components/MessageComposer';
import { usePreparationChat } from '@/hooks/usePreparationChat';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
export function PreparationChat({ onReady, onEditProfile }: { onReady: () => void; onEditProfile?: () => void }) {
  const chat = usePreparationChat();
  const scroll = useRef<ScrollView>(null), started = useRef<string | null>(null);
  const { height } = useWindowDimensions();
  const conversation = chat.conversation;
  useEffect(() => {
    if (conversation?.status !== 'ready') return;
    const key = `${conversation.id}:${conversation.sourceRevision}`;
    if (started.current === key) return;
    started.current = key; onReady();
  }, [conversation?.id, conversation?.status, conversation?.sourceRevision, onReady]);
  if (!conversation && chat.busy) return <LoadingState label="Ton coach arrive…" />;
  const waiting = chat.busy || conversation?.status === 'queued' || conversation?.status === 'processing';
  return <View style={s.stack}>
    <Text style={s.title}>On prépare ta semaine</Text>
    <ScrollView ref={scroll} nestedScrollEnabled style={{ maxHeight: height * 0.48 }} contentContainerStyle={s.stack}
      keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
      <ChatMessages messages={conversation?.messages ?? []} />
    </ScrollView>
    {waiting ? <View style={s.row}><ActivityIndicator color={colors.primary} /><Text style={s.caption}>Ton coach te répond…</Text></View> : null}
    {chat.error || conversation?.error ? <><Banner variant="error" message={chat.error ?? conversation?.error ?? ''} /><Button text="Réessayer" variant="outline" onPress={chat.retry} disabled={chat.busy} /></> : null}
    {conversation?.status === 'awaiting_answer' ? <>
      {!chat.retryPending ? conversation.choices.map(choice => <Button key={choice} text={choice} variant="secondary" onPress={() => void chat.send(choice)} disabled={waiting} />) : null}
      <MessageComposer value={chat.draft} onChange={chat.setDraft} onSend={() => void chat.send()} placeholder="Dis-moi…" disabled={waiting || chat.retryPending} />
    </> : null}
    {conversation?.status === 'blocked' && onEditProfile ? <Button text="Revoir mon profil" variant="outline" onPress={onEditProfile} /> : null}
    {conversation?.status === 'ready' ? <LoadingState label="C’est parti, je prépare ton programme…" /> : null}
  </View>;
}
const s = StyleSheet.create({ stack: { gap: 14 }, row: { flexDirection: 'row', gap: 10, alignItems: 'center' }, title: { fontFamily: fontFamily.bold, color: colors.text, fontSize: 20 }, caption: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 13 } });
