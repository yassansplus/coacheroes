import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Motion } from '@/components/Motion';
import { feedback } from '@/utils/feedback';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export type BottomTabItem<T extends string> = {
  icon?: ReactNode;
  label: string;
  value: T;
};

type BottomTabBarProps<T extends string> = {
  highlightActiveTab?: boolean;
  items: readonly BottomTabItem<T>[];
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  value: T;
};

export function BottomTabBar<T extends string>({
  items,
  onChange,
  style,
  value,
  highlightActiveTab = false,
}: BottomTabBarProps<T>) {
  const [width, setWidth] = useState(0);
  return (
    <View accessibilityRole="tablist" onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.bar, style]}>
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => { if (!selected) { feedback(); onChange(item.value); } }}
            style={({ pressed }) => [styles.tab, selected && highlightActiveTab && styles.activeTab, pressed && styles.pressed]}
          >
            <Motion trigger={selected} pop style={[styles.icon, selected && styles.activeIcon]}>{item.icon}</Motion>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.label, width > 0 && width / items.length < 64 && { fontSize: 8 }, selected && styles.activeLabel]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 6,
    shadowColor: '#6c85ba',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.68,
  },
  activeTab: { backgroundColor: colors.primarySurface, borderRadius: 22 },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  activeIcon: {
    transform: [{ translateY: -1 }],
  },
  label: {
    maxWidth: '100%',
    paddingHorizontal: 2,
    color: '#7d8cad',
    fontFamily: fontFamily.medium,
    fontSize: 9,
  },
  activeLabel: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
});
