import { useState, type PropsWithChildren } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Card } from '@/components/Card';
import { colors } from '@/theme/colors';

type ProgressCardRowProps = PropsWithChildren<{
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function ProgressCardRow({ children, scrollable = false, style }: ProgressCardRowProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const gap = Math.min(12, Math.max(6, Math.round(rowWidth * 0.016)));
  const padding = Math.min(12, Math.max(8, Math.round(rowWidth * 0.016)));

  function handleLayout({ nativeEvent }: LayoutChangeEvent) {
    setRowWidth(nativeEvent.layout.width);
  }

  return (
    <Card onLayout={handleLayout} style={[styles.card, { padding }, style]}>
      {scrollable ? (
        <ScrollView
          horizontal
          contentContainerStyle={[styles.content, { gap }]}
          showsHorizontalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, { gap }]}>{children}</View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    padding: 12,
  },
  content: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 12,
  },
});
