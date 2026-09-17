import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type FeedbackVariant = 'info' | 'success' | 'error';

type BannerProps = {
  actionLabel?: string;
  icon?: ReactNode;
  message: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  title?: string;
  variant?: FeedbackVariant;
};

const variants: Record<FeedbackVariant, { backgroundColor: string; color: string }> = {
  info: { backgroundColor: '#edf5ff', color: colors.primary },
  success: { backgroundColor: colors.successSurface, color: colors.success },
  error: { backgroundColor: '#fdf2ee', color: colors.energy },
};

export function Banner({
  actionLabel,
  icon,
  message,
  onAction,
  style,
  title,
  variant = 'info',
}: BannerProps) {
  const palette = variants[variant];

  return (
    <View style={[styles.banner, { backgroundColor: palette.backgroundColor }, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.content}>
        {title ? <Text style={[styles.title, { color: palette.color }]}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Text style={[styles.actionText, { color: palette.color }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    marginBottom: 2,
  },
  message: {
    color: '#42547c',
    fontFamily: fontFamily.medium,
    fontSize: 11,
    lineHeight: 16,
  },
  action: {
    paddingVertical: 4,
  },
  actionText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
});
