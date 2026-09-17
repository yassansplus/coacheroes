import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Button } from '@/components/Button';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type ErrorStateProps = {
  description?: string;
  icon?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
  title?: string;
};

export function ErrorState({
  description = 'Vérifie ta connexion puis réessaie.',
  icon,
  onRetry,
  retryLabel = 'Réessayer',
  style,
  title = 'Une erreur est survenue',
}: ErrorStateProps) {
  return (
    <View accessibilityRole="alert" style={[styles.container, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onRetry ? <Button onPress={onRetry} style={styles.action} text={retryLabel} /> : null}
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
    color: colors.energy,
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
