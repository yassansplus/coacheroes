import { StyleSheet, Switch, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type ToggleProps = {
  disabled?: boolean;
  label?: string;
  onValueChange: (value: boolean) => void;
  style?: StyleProp<ViewStyle>;
  value: boolean;
};

export function Toggle({ disabled = false, label, onValueChange, style, value }: ToggleProps) {
  const nativeToggle = (
    <Switch
      disabled={disabled}
      ios_backgroundColor="#dfe6f4"
      onValueChange={onValueChange}
      thumbColor="#fefefe"
      trackColor={{ false: '#dfe6f4', true: colors.primary }}
      value={value}
    />
  );

  if (!label) {
    return nativeToggle;
  }

  return (
    <View style={[styles.row, disabled && styles.disabled, style]}>
      <Text style={styles.label}>{label}</Text>
      {nativeToggle}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: '#141b41',
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
  },
});
