import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, resolveColor, type AppColor } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type BadgeVariant = 'primary' | 'success' | 'energy' | 'neutral';

type BadgeProps = {
  backgroundColor?: AppColor;
  label: string;
  style?: StyleProp<ViewStyle>;
  textColor?: AppColor;
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, { backgroundColor: string; textColor: string }> = {
  primary: { backgroundColor: '#edf5ff', textColor: colors.primary },
  success: { backgroundColor: colors.successSurface, textColor: colors.success },
  energy: { backgroundColor: '#fdf2ee', textColor: colors.energy },
  neutral: { backgroundColor: '#eef2f8', textColor: '#6073a4' },
};

export function Badge({
  backgroundColor,
  label,
  style,
  textColor,
  variant = 'primary',
}: BadgeProps) {
  const palette = variants[variant];

  return (
    <View style={[styles.badge, { backgroundColor: backgroundColor ? resolveColor(backgroundColor) : palette.backgroundColor }, style]}>
      <Text style={[styles.text, { color: textColor ? resolveColor(textColor) : palette.textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
  },
});
