import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/Button';
import { fontFamily } from '@/theme/typography';

type EmptyStateProps = {
  actionLabel?: string;
  description?: string;
  icon?: ReactNode;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function EmptyState({
  actionLabel,
  description,
  icon,
  onAction,
  style,
  title,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? <Button onPress={onAction} style={styles.action} text={actionLabel} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    alignItems: 'center',
    height: 72,
    justifyContent: 'center',
    marginBottom: 12,
    width: 72,
  },
  title: {
    color: '#141b41',
    fontFamily: fontFamily.bold,
    fontSize: 16,
    textAlign: 'center',
  },
  description: {
    color: '#6073a4',
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  action: {
    marginTop: 16,
  },
});
