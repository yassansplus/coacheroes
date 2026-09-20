import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { Symbol, type SymbolName } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { s } from './styles';

export const tones = { green: [colors.successSurface, colors.success], purple: [colors.accentSurface, colors.accent], red: [colors.energySurface, colors.energy], blue: [colors.primarySurface, colors.primary], neutral: [colors.background, colors.textSecondary] } as const;
export type Tone = keyof typeof tones;
export function CoachIcon({ icon, glyph, tone = 'blue', size = 42 }: { icon?: IllustrationName; glyph?: SymbolName; tone?: Tone; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: 13, backgroundColor: tones[tone][0], alignItems: 'center', justifyContent: 'center' }}>{icon ? <Illustration name={icon} size={size * 0.82} /> : <Symbol name={glyph ?? 'info'} size={size * 0.55} color={tones[tone][1]} />}</View>;
}
export function CoachRow({ title, description, icon, onPress, divider = false, trailing }: { title: string; description?: ReactNode; icon?: ReactNode; onPress?: () => void; divider?: boolean; trailing?: ReactNode }) {
  const content = <>{icon}<View style={s.grow}><Text style={s.label}>{title}</Text>{description ? <Text style={s.body}>{description}</Text> : null}</View>{trailing ?? (onPress ? <Symbol name="chevron" size={18} color="textMuted" /> : null)}</>;
  const style = [s.row, divider && s.divider, { paddingVertical: 12, minHeight: 60 }];
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [...style, { opacity: pressed ? 0.65 : 1 }]}>{content}</Pressable> : <View style={style}>{content}</View>;
}
