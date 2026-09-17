import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type LoadingStateProps = {
  label?: string;
  size?: 'large' | 'small';
  style?: StyleProp<ViewStyle>;
};

export function LoadingState({ label = 'Chargement…', size = 'small', style }: LoadingStateProps) {
  return (
    <View accessibilityLabel={label} accessibilityRole="progressbar" style={[styles.container, style]}>
      <ActivityIndicator color={colors.primary} size={size} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    padding: 24,
  },
  label: {
    color: '#6073a4',
    fontFamily: fontFamily.medium,
    fontSize: 12,
  },
});
