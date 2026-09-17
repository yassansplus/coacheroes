import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';

type CardProps = PropsWithChildren<
  Omit<ViewProps, 'children' | 'style'> & {
    style?: StyleProp<ViewStyle>;
  }
>;

export function Card({ children, style, ...viewProps }: CardProps) {
  return (
    <View {...viewProps} style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
  },
});
