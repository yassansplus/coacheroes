import { Text } from '@/components/LocalizedText';
import { localizeLabel, getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import type { ReactNode } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Motion } from '@/components/Motion';
import { Card } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
export type ChatBubbleMessage = { id: string; role: 'user' | 'assistant'; text: string; createdAt: number | string; image?: string; renderKey?: string };
export function ChatMessages({ messages, renderActions }: { messages: ChatBubbleMessage[]; renderActions?: (id: string) => ReactNode }) {
  useLanguage();
  return <>{messages.map(message => {
    const user = message.role === 'user';
    return <Motion key={message.id} trigger={message.renderKey ?? message.id} style={[s.row, { alignItems: 'flex-start', justifyContent: user ? 'flex-end' : 'flex-start', gap: 7 }]}>
      {!user ? <Illustration name="coach" size={32} /> : null}
      <Card style={{ maxWidth: user ? '86%' : undefined, flex: user ? undefined : 1, minWidth: 0, padding: 15, gap: 12, backgroundColor: user ? colors.accentSurface : colors.surface }}>
        {message.image ? <Image source={{ uri: message.image }} style={{ width: '100%', aspectRatio: 1.4, borderRadius: 14 }} resizeMode="cover" accessibilityLabel={localizeLabel("Photo jointe à la conversation")} /> : null}
        {message.text ? <Text translate={false} style={s.text}>{message.text}</Text> : null}
        {renderActions?.(message.id)}
        <View style={[s.row, { justifyContent: user ? 'flex-end' : 'flex-start', gap: 5 }]}><Text style={s.caption}>{new Date(message.createdAt).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}</Text>{user ? <Symbol name="check" size={13} color="primary" /> : null}</View>
      </Card>
    </Motion>;
  })}</>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' }, text: { fontFamily: fontFamily.semiBold, fontSize: 15, lineHeight: 24, color: colors.text }, caption: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textSecondary } });
