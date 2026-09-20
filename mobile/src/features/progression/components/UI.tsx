import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AnimatedMetricText, Motion } from '@/components/Motion';
import { Card } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { Symbol, type SymbolName } from '@/components/Symbol';
import type { IllustrationName } from '@/config/illustrations';
import { colors } from '@/theme/colors';
import { s } from './styles';

export function TileIcon({ name, glyph, tone = 'blue', size = 43 }: { name?: IllustrationName; glyph?: SymbolName; tone?: 'blue' | 'purple' | 'green' | 'red'; size?: number }) {
  const palette = { blue: [colors.primarySurface, colors.primary], purple: [colors.accentSurface, colors.accent], green: [colors.successSurface, colors.success], red: [colors.energySurface, colors.energy] };
  return <View style={{ width: size, height: size, borderRadius: 13, backgroundColor: palette[tone][0], alignItems: 'center', justifyContent: 'center' }}>{name ? <Illustration name={name} size={size * 0.72} /> : <Symbol name={glyph ?? 'chart'} color={palette[tone][1]} size={size * 0.53} />}</View>;
}
export function Change({ text, tone = 'green', small = false }: { text: string; tone?: 'green' | 'blue' | 'red'; small?: boolean }) {
  return <View style={{ alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 13, backgroundColor: tone === 'green' ? colors.successSurface : tone === 'red' ? colors.energySurface : colors.primarySurface }}><Text style={[s.label, small && { fontSize: 10, lineHeight: 16 }, { color: tone === 'green' ? colors.successText : tone === 'red' ? colors.energy : colors.primary }]}>{text}</Text></View>;
}
export function Metric({ title, value, icon, change, onPress, compact = false, smallChange = false, compactValueSize = 22, compactLabelSize, compactTitle }: { title: string; value: string; icon: ReactNode; change?: string; onPress?: () => void; compact?: boolean; smallChange?: boolean; compactValueSize?: number; compactLabelSize?: number; compactTitle?: string }) {
  const body = (
    <Card style={[s.card, { flex: 1, padding: compact ? 10 : 14, gap: 8 }]}>
      {compact ? (
        <>
          {icon}
          <Text
            accessibilityLabel={title}
            numberOfLines={compactTitle !== undefined ? 1 : undefined}
            adjustsFontSizeToFit={compactTitle !== undefined}
            minimumFontScale={0.85}
            style={[s.body, compactLabelSize ? { fontSize: compactLabelSize, lineHeight: compactLabelSize + 6 } : undefined]}
          >
            {compactTitle ?? title}
          </Text>
          <AnimatedMetricText value={value} adjustsFontSizeToFit numberOfLines={1} style={[s.value, { fontSize: compactValueSize }]} />
        </>
      ) : (
        <View style={s.row}>
          {icon}
          <View style={s.grow}>
            <Text style={s.body}>{title}</Text>
            <AnimatedMetricText value={value} adjustsFontSizeToFit numberOfLines={1} style={[s.value, { fontSize: 22 }]} />
          </View>
        </View>
      )}
      {change ? <Motion trigger={change} delay={150} pop><Change text={change} small={smallChange} /></Motion> : null}
    </Card>
  );

  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={title} style={{ flex: 1, minWidth: 135 }} onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    <View style={s.grow}>{body}</View>
  );
}
export function Row({ title, subtitle, value, icon, trailing, onPress }: { title: string; subtitle?: string; value?: string; icon?: ReactNode; trailing?: ReactNode; onPress?: () => void }) {
  const children = <>{icon}<View style={s.grow}><Text style={value ? s.body : s.label}>{title}</Text>{value ? <Text style={[s.value, { fontSize: 23 }]}>{value}</Text> : null}{subtitle ? <Text style={s.body}>{subtitle}</Text> : null}</View>{trailing}{onPress ? <Symbol name="chevron" color="textSecondary" size={17} /> : null}</>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={title} style={[s.row, s.tinted, value ? { backgroundColor: colors.surface } : undefined]} onPress={onPress}>{children}</Pressable> : <View style={[s.row, s.tinted, value ? { backgroundColor: colors.surface } : undefined]}>{children}</View>;
}
