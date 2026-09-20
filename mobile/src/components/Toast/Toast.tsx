import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Motion } from '@/components/Motion';
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
  const hide = useRef(onHide);
  hide.current = onHide;
  const canHide = Boolean(onHide);
  useEffect(() => {
    if (!visible || !canHide || duration <= 0) {
      return undefined;
    }

    const timeout = setTimeout(() => hide.current?.(), duration);
    return () => clearTimeout(timeout);
  }, [duration, canHide, visible, message]);

  if (!visible) {
    return null;
  }

  const palette = variants[variant];

  return (
    <Motion trigger={message} style={[styles.toast, { backgroundColor: palette.backgroundColor }, style]}>
      <Text accessibilityLiveRegion="polite" style={[styles.message, { color: palette.color }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Text style={[styles.actionText, { color: palette.color }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Motion>
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
