import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fontFamily } from '@/theme/typography';

type AppHeaderProps = {
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title: string;
  trailing?: ReactNode;
};

export function AppHeader({ leading, style, subtitle, title, trailing }: AppHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.side}>{leading}</View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.side, styles.trailing]}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 52,
  },
  side: {
    alignItems: 'flex-start',
    minWidth: 44,
  },
  trailing: {
    alignItems: 'flex-end',
  },
  content: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    color: '#141b41',
    fontFamily: fontFamily.bold,
    fontSize: 17,
  },
  subtitle: {
    color: '#6073a4',
    fontFamily: fontFamily.medium,
    fontSize: 10,
    marginTop: 2,
  },
});
