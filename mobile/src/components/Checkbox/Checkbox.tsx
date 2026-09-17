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

type CheckboxProps = {
  activeColor?: AppColor;
  checked: boolean;
  disabled?: boolean;
  label?: string;
  onChange: (checked: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

/** Une case indépendante contrôlée, contrairement au RadioButton exclusif. */
export function Checkbox({
  activeColor = 'success',
  checked,
  disabled = false,
  label,
  onChange,
  style,
}: CheckboxProps) {
  const selectionColor = resolveColor(activeColor);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, pressed && !disabled && styles.pressed, disabled && styles.disabled, style]}
    >
      <View style={[styles.box, checked && { backgroundColor: selectionColor, borderColor: selectionColor }]}>
        {checked ? <Text style={styles.check}>✓</Text> : null}
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
  box: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#c7d2e8',
    borderRadius: 7,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  check: {
    color: colors.surface,
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 18,
  },
  label: {
    color: '#141b41',
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
});
