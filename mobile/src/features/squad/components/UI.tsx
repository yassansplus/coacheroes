import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { Symbol, type SymbolName } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { feedback } from '@/utils/feedback';
import type { Member } from '../data';

const tones = {
  purple: [colors.squadPurple, colors.accentSurface], green: [colors.successText, colors.successSurface],
  coral: [colors.energy, colors.energySurface], gold: [colors.warning, colors.warningSurface], blue: [colors.primary, colors.primarySurface],
} as const;
export type Tone = keyof typeof tones;
export function TileIcon({ name, tone = 'purple', size = 38 }: { name: SymbolName | IllustrationName; tone?: Tone; size?: number }) {
  const illustrated = ['boxing', 'trophy', 'punchingBag', 'flame', 'apple'].includes(name);
  return <View style={{ width: size, height: size, borderRadius: size * 0.26, backgroundColor: tones[tone][1], alignItems: 'center', justifyContent: 'center' }}>{illustrated ? <Illustration name={name as IllustrationName} size={size * 0.7} /> : <Symbol name={name as SymbolName} size={size * 0.58} color={tones[tone][0]} />}</View>;
}
export function Avatar({ member, size = 32, short = false }: { member: Member; size?: number; short?: boolean }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: member.background, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: fontFamily.semiBold, color: member.color, fontSize: size * 0.35 }}>{short ? member.name[0] : member.initials}</Text></View>;
}
export function Emblem({ gold = false, trophy = false, size = 72 }: { gold?: boolean; trophy?: boolean; size?: number }) {
  return <View style={{ width: size, height: size * 1.1, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 110" style={StyleSheet.absoluteFill}>
      <Defs><LinearGradient id="badge" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={gold ? colors.googleYellow : colors.primary} /><Stop offset="1" stopColor={gold ? colors.warning : colors.squadPurple} /></LinearGradient></Defs>
      <Polygon points="50,1 95,27 95,82 50,109 5,82 5,27" fill="url(#badge)" />
      <Polygon points="50,14 84,34 84,75 50,95 16,75 16,34" fill={colors.white} opacity={0.18} />
    </Svg>
    {trophy ? <Illustration name="trophy" size={size * 0.67} /> : <Symbol name="users" color="white" size={size * 0.58} />}
  </View>;
}
export function Panel({ children }: { children: ReactNode }) { return <Card style={s.panel}>{children}</Card>; }
export function Heading({ children, action, onPress }: { children: ReactNode; action?: string; onPress?: () => void }) {
  return <View style={[s.row, { marginTop: 5, justifyContent: 'space-between' }]}><Text style={s.heading}>{children}</Text>{action && onPress ? <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}><Text style={s.link}>{action}</Text></Pressable> : null}</View>;
}
export function Action({ text, onPress, outline = false }: { text: string; onPress?: () => void; outline?: boolean }) {
  return <Button text={text} onPress={onPress ?? (() => {})} disabled={!onPress} hapticFeedback="light" radius={16} variant={outline ? 'outline' : 'primary'} style={{ minHeight: 42, opacity: 1, borderColor: outline ? colors.squadOutline : undefined }} textStyle={{ fontSize: 13 }} />;
}
export function Row({ children, onPress, last = false }: { children: ReactNode; onPress?: () => void; last?: boolean }) {
  const style = [s.row, { minHeight: 44, paddingVertical: 8 }, !last && s.divider];
  return onPress ? <Pressable accessibilityRole="button" onPress={() => { feedback(); onPress(); }} style={({ pressed }) => [...style, { opacity: pressed ? 0.65 : 1 }]}>{children}</Pressable> : <View style={style}>{children}</View>;
}
export function Info({ children }: { children: ReactNode }) { return <View style={[s.row, s.info]}><TileIcon name="info" tone="blue" size={30} /><Text style={[s.muted, s.grow]}>{children}</Text></View>; }
export const s = StyleSheet.create({
  panel: { padding: 15, borderRadius: 18, gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 }, heading: { fontFamily: fontFamily.bold, fontSize: 19, color: colors.text, flexShrink: 1 },
  title: { fontFamily: fontFamily.bold, fontSize: 17, color: colors.text }, body: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.text },
  bold: { fontFamily: fontFamily.bold, color: colors.text }, muted: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.textSecondary },
  small: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textSecondary }, number: { fontFamily: fontFamily.bold, fontSize: 26, color: colors.text },
  link: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.squadPurple }, divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  stack: { gap: 12 }, info: { padding: 12, borderRadius: 16, backgroundColor: colors.onboardingBackground },
});
