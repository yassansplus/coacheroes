import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, resolveColor, type AppColor } from '@/theme/colors';

type IconButtonVariant = 'primary' | 'surface' | 'outline' | 'ghost';

type IconButtonProps = {
  accessibilityLabel: string;
  backgroundColor?: AppColor;
  disabled?: boolean;
  icon: ReactNode;
  onPress: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  variant?: IconButtonVariant;
};

export function IconButton({
  accessibilityLabel,
  backgroundColor,
  disabled = false,
  icon,
  onPress,
  size = 44,
  style,
  variant = 'surface',
}: IconButtonProps) {
  const background = backgroundColor ? resolveColor(backgroundColor) : undefined;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        background && { backgroundColor: background, borderColor: background },
        { borderRadius: size / 2, height: size, width: size },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View pointerEvents="none">{icon}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  surface: {
    backgroundColor: colors.surface,
    shadowColor: '#6c85ba',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: '#dce4f2',
    borderWidth: 1.5,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
