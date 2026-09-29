import { Text } from '@/components/LocalizedText';
import { useLanguage } from '@/i18n/useLanguage';
import { t } from '@/i18n/core';
import { equippedTitle, gameRewards } from '@/config/gameRewards';
import { useId, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { ProgressBar } from '@/components/ProgressBar';
import { useGameProgress } from '@/store/gameProgress';
import { useMetricMotion } from '@/hooks/useMetricMotion';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { feedback } from '@/utils/feedback';

export function Panel({ children }: { children: ReactNode }) {
  useLanguage(); return <Card style={s.panel}>{children}</Card>; }
export function Heading({ children }: { children: ReactNode }) {
  useLanguage(); return <Text style={s.heading}>{children}</Text>; }
export function Pill({ children, green = false }: { children: ReactNode; green?: boolean }) {
  useLanguage(); return <View style={{ backgroundColor: green ? colors.successSurface : colors.accentSurface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', maxWidth: '100%' }}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.label, { color: green ? colors.successText : colors.squadPurple }]}>{children}</Text></View>; }
export function Icon({ name, size = 42, round = false }: { name: IllustrationName; size?: number; round?: boolean }) {
  useLanguage(); return <View style={{ width: size, height: size, borderRadius: round ? size / 2 : 12, backgroundColor: ['flame', 'cutlery', 'apple'].includes(name) ? colors.energySurface : ['calendar', 'shaker'].includes(name) ? colors.successSurface : colors.accentSurface, alignItems: 'center', justifyContent: 'center' }}><Illustration name={name} size={size * 0.63} /></View>; }
export function Crest({ icon = 'star', size = 86, locked = false, gold = false, label }: { icon?: IllustrationName; size?: number; locked?: boolean; gold?: boolean; label?: string }) {
  useLanguage();
  const id = useId().replace(/:/g, '');
  return <View style={{ width: size, height: size * 1.08, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 108" style={StyleSheet.absoluteFill}><Defs><LinearGradient id={id} x1="0" y1="0" x2="0.7" y2="1"><Stop offset="0" stopColor={locked ? colors.border : gold ? colors.googleYellow : colors.accentSurface} /><Stop offset="1" stopColor={locked ? colors.textMuted : gold ? colors.warning : colors.squadPurple} /></LinearGradient></Defs><Path d="M43 3Q50-1 57 3L91 23Q97 27 97 35V75Q97 82 90 86L57 105Q50 109 43 105L10 86Q3 82 3 75V35Q3 27 10 23Z" fill={`url(#${id})`} /><Path d="M50 15 85 36v39L50 96 15 75V36Z" fill={gold ? colors.warning : colors.squadPurple} opacity={0.35} /></Svg>
    <Illustration name={icon} size={size * (label ? 0.4 : 0.55)} />{label ? <Text style={[s.big, { color: colors.white, fontSize: size * 0.25 }]}>{label}</Text> : null}
    {locked ? <View style={{ position: 'absolute', bottom: 1, right: 0, backgroundColor: colors.border, padding: 7, borderRadius: 20 }}><Symbol name="lock" size={17} color="textSecondary" /></View> : null}
  </View>;
}
export function Action({ text, onPress, outline = false }: { text: string; onPress: () => void; outline?: boolean }) {
  useLanguage(); return <Button text={text} onPress={onPress} variant={outline ? 'outline' : 'primary'} hapticFeedback="light" radius={24} style={{ minHeight: 46, borderColor: outline ? colors.border : undefined }} textStyle={{ fontSize: 13 }} />; }
export function Row({ children, onPress, last = false }: { children: ReactNode; onPress?: () => void; last?: boolean }) {
  useLanguage(); const style = [s.row, { paddingVertical: 10 }, !last && s.divider]; return onPress ? <Pressable accessibilityRole="button" onPress={() => { feedback(); onPress(); }} style={({ pressed }) => [...style, { opacity: pressed ? 0.7 : 1 }]}>{children}</Pressable> : <View style={style}>{children}</View>; }
export function Info({ children }: { children: ReactNode }) {
  useLanguage(); return <View style={[s.row, { backgroundColor: colors.primarySurface, borderRadius: 16, padding: 14 }]}><Symbol name="info" color="textSecondary" /><Text style={[s.small, s.grow]}>{children}</Text></View>; }
export function LevelHero({ rewards = false }: { rewards?: boolean }) {
  useLanguage();
  const game = useGameProgress();
  const [xp] = useMetricMotion([game.xp], { duration: 1500 });
  const title = equippedTitle(game.equipment.title);
  return <Panel><View style={[s.row, { gap: 18, paddingVertical: 4 }]}><Crest /><View style={[s.grow, { gap: 6 }]}><Text style={s.big}>Niveau {game.level}</Text>{rewards ? <Pill>{t('{p0} / {p1} éléments débloqués', { p0: gameRewards.filter(item => game.unlockedRewards.includes(item.id)).length, p1: gameRewards.length })}</Pill> : title ? <Pill>{title}</Pill> : null}</View></View><ProgressBar progress={xp / game.target * 100} animated={false} height={13} /><View style={[s.row, { justifyContent: 'space-between', gap: 5 }]}><Text style={s.small}>{Math.round(xp)} / {game.target} XP</Text><Text style={s.small}>{game.target - game.xp} XP avant le niveau {game.level + 1}</Text></View></Panel>;
}
export const s = StyleSheet.create({
  panel: { padding: 16, borderRadius: 20, gap: 13 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, grow: { flex: 1, minWidth: 0 },
  heading: { fontFamily: fontFamily.bold, fontSize: 20, color: colors.text, marginTop: 8 }, big: { fontFamily: fontFamily.bold, fontSize: 30, color: colors.text },
  title: { fontFamily: fontFamily.bold, fontSize: 16, color: colors.text }, body: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.text },
  label: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.text }, small: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textSecondary }, muted: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textSecondary },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, stack: { gap: 14 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
