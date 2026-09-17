import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type ToastVariant = 'info' | 'success' | 'error';

type ToastProps = {
  actionLabel?: string;
  duration?: number;
  message: string;
  onAction?: () => void;
  onHide?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: ToastVariant;
  visible: boolean;
};

const variants: Record<ToastVariant, { backgroundColor: string; color: string }> = {
  info: { backgroundColor: '#18234b', color: colors.surface },
  success: { backgroundColor: colors.success, color: colors.surface },
  error: { backgroundColor: colors.energy, color: colors.surface },
};

export function Toast({
  actionLabel,
  duration = 3000,
  message,
  onAction,
  onHide,
  style,
  variant = 'info',
  visible,
}: ToastProps) {
  useEffect(() => {
    if (!visible || !onHide || duration <= 0) {
      return undefined;
    }

    const timeout = setTimeout(onHide, duration);
    return () => clearTimeout(timeout);
  }, [duration, onHide, visible]);

  if (!visible) {
    return null;
  }

  const palette = variants[variant];

  return (
    <View accessibilityLiveRegion="polite" style={[styles.toast, { backgroundColor: palette.backgroundColor }, style]}>
      <Text style={[styles.message, { color: palette.color }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Text style={[styles.actionText, { color: palette.color }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 16,
    maxWidth: 520,
    paddingHorizontal: 16,
    paddingVertical: 13,
    shadowColor: '#172857',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  message: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
  },
  action: {
    paddingVertical: 2,
  },
  actionText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});
