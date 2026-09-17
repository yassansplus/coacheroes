import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { resolveColor, type AppColor } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export type CardHighlightBackground = AppColor;

type CardHighlightProps = {
  icon: ReactNode;
  title?: string;
  value?: string;
  color?: string;
  backgroundColor?: CardHighlightBackground;
  style?: StyleProp<ViewStyle>;
};

export function CardHighlight({
  icon,
  title,
  value,
  color = '#111827',
  backgroundColor = 'coral',
  style,
}: CardHighlightProps) {
  const resolvedBackgroundColor = resolveColor(backgroundColor);
  const hasTextContent = Boolean(title || value);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: resolvedBackgroundColor },
        !hasTextContent && styles.iconOnly,
        style,
      ]}
    >
      {icon}
      {hasTextContent ? (
        <View>
          {title ? <Text style={[styles.title, { color }]}>{title}</Text> : null}
          {value ? <Text style={[styles.value, { color }]}>{value}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 12,
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  iconOnly: {
    gap: 0,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  value: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
  },
});
