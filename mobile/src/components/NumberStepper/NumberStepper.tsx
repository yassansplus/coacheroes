import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

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
  formatValue?: (value: number) => string;
  style?: StyleProp<ViewStyle>;
};

export function NumberStepper({ value, onChange, label, minimum = 0, maximum = 999, step = 1,
  size = 'compact', formatValue = value => String(value), style }: NumberStepperProps) {
  const large = size === 'large';
  const update = (direction: number) => onChange(Math.min(maximum, Math.max(minimum, Number((value + direction * step).toFixed(2)))));
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
