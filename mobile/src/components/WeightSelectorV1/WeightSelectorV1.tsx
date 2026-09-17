import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card } from '@/components/Card';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type WeightSelectorV1Props = {
  disabled?: boolean;
  label?: string;
  maximum?: number;
  minimum?: number;
  onChange: (value: number) => void;
  step?: number;
  style?: StyleProp<ViewStyle>;
  unit?: string;
  value: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatWeight(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

export function WeightSelectorV1({
  disabled = false,
  label = 'Poids',
  maximum = 300,
  minimum = 20,
  onChange,
  step = 0.5,
  style,
  unit = 'kg',
  value,
}: WeightSelectorV1Props) {
  const changeWeight = (direction: -1 | 1) => {
    const nextValue = clamp(Math.round((value + direction * step) * 10) / 10, minimum, maximum);
    onChange(nextValue);
  };

  return (
    <Card style={[styles.card, disabled && styles.disabled, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.controls}>
        <Pressable
          accessibilityLabel="Réduire le poids"
          accessibilityRole="button"
          disabled={disabled || value <= minimum}
          onPress={() => changeWeight(-1)}
          style={({ pressed }) => [styles.control, pressed && styles.controlPressed]}
        >
          <Text style={styles.controlLabel}>−</Text>
        </Pressable>

        <View style={styles.valueContainer}>
          <Text style={styles.value}>{formatWeight(value)}</Text>
          <Text style={styles.unit}>{unit}</Text>
        </View>

        <Pressable
          accessibilityLabel="Augmenter le poids"
          accessibilityRole="button"
          disabled={disabled || value >= maximum}
          onPress={() => changeWeight(1)}
          style={({ pressed }) => [styles.control, pressed && styles.controlPressed]}
        >
          <Text style={styles.controlLabel}>+</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#141b41',
    fontFamily: fontFamily.bold,
    fontSize: 14,
  },
  controls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  control: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  controlPressed: {
    opacity: 0.7,
  },
  controlLabel: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 24,
  },
  valueContainer: {
    alignItems: 'baseline',
    flexDirection: 'row',
    minWidth: 74,
  },
  value: {
    color: '#141b41',
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
  },
  unit: {
    color: '#6073a4',
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    marginLeft: 4,
  },
});
