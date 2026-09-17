import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, resolveColor, type AppColor } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type RadioButtonProps = {
  activeColor?: AppColor;
  disabled?: boolean;
  label?: string;
  onSelect: () => void;
  selected: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Un choix exclusif contrôlé, à regrouper avec les autres RadioButton. */
export function RadioButton({
  activeColor = 'primary',
  disabled = false,
  label,
  onSelect,
  selected,
  style,
}: RadioButtonProps) {
  const selectionColor = resolveColor(activeColor);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      style={({ pressed }) => [styles.row, pressed && !disabled && styles.pressed, disabled && styles.disabled, style]}
    >
      <View style={[styles.circle, selected && { borderColor: selectionColor }]}>
        {selected ? <View style={[styles.dot, { backgroundColor: selectionColor }]} /> : null}
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
  circle: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#c7d2e8',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  dot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  label: {
    color: '#141b41',
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
});
