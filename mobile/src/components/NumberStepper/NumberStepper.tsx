import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { feedback } from '@/utils/feedback';
import { Motion } from '@/components/Motion';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type NumberStepperProps = {
  value: number;
  onChange: (value: number) => void;
  label: string;
  minimum?: number;
  maximum?: number;
  step?: number;
  size?: 'compact' | 'large';
  layout?: 'inline' | 'stacked';
  unit?: string;
  formatValue?: (value: number) => string;
  style?: StyleProp<ViewStyle>;
};

export function NumberStepper({ value, onChange, label, minimum = 0, maximum = 999, step = 1,
  size = 'compact', layout = 'inline', unit, formatValue = value => String(value), style }: NumberStepperProps) {
  const large = size === 'large';
  const update = (direction: number) => { const next = Math.min(maximum, Math.max(minimum, Number((value + direction * step).toFixed(2)))); if (next !== value) { feedback(); onChange(next); } };
  if (layout === 'stacked') return <View style={[{ gap: 12, alignItems: 'stretch' }, style]}>
    <Motion trigger={value} pop><Text accessibilityLabel={`${label} : ${formatValue(value)} ${unit ?? ''}`} accessibilityLiveRegion="polite" numberOfLines={1} adjustsFontSizeToFit style={[styles.largeValue, { fontSize: 46, textAlign: 'center', color: colors.text, fontFamily: fontFamily.bold }]}>{formatValue(value)}</Text></Motion>
    <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 16, textAlign: 'center', minHeight: 20 }}>{unit ?? ''}</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 6 }}><IconButton accessibilityLabel={`Diminuer ${label}`} disabled={value <= minimum} size={46} backgroundColor="accentSurface" icon={<Symbol name="minus" color="primary" />} onPress={() => update(-1)} /><IconButton accessibilityLabel={`Augmenter ${label}`} disabled={value >= maximum} size={46} backgroundColor="accentSurface" icon={<Symbol name="plus" color="primary" />} onPress={() => update(1)} /></View>
  </View>;
  return <View style={[styles.container, large && styles.large, style]}>
    <IconButton accessibilityLabel={`Diminuer ${label}`} disabled={value <= minimum} size={large ? 42 : 32}
      backgroundColor="primaryTint" icon={<Symbol name="minus" size={large ? 22 : 17} color="primary" />} onPress={() => update(-1)} />
    <Text accessibilityLabel={`${label} : ${formatValue(value)}`} accessibilityLiveRegion="polite"
      style={[styles.value, large && styles.largeValue]}>{formatValue(value)}</Text>
    <IconButton accessibilityLabel={`Augmenter ${label}`} disabled={value >= maximum} size={large ? 42 : 32}
      backgroundColor="primaryTint" icon={<Symbol name="plus" size={large ? 22 : 17} color="primary" />} onPress={() => update(1)} />
  </View>;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    padding: 5, borderRadius: 16, borderColor: colors.border, borderWidth: 1 },
  large: { backgroundColor: colors.primarySurface, borderWidth: 0, padding: 12, minHeight: 68 },
  value: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 16, minWidth: 24, textAlign: 'center' },
  largeValue: { fontSize: 28, flex: 1 },
});
