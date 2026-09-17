import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export type BottomTabItem<T extends string> = {
  icon?: ReactNode;
  label: string;
  value: T;
};

type BottomTabBarProps<T extends string> = {
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
}: BottomTabBarProps<T>) {
  return (
    <View accessibilityRole="tablist" style={[styles.bar, style]}>
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(item.value)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={[styles.icon, selected && styles.activeIcon]}>{item.icon}</View>
            <Text style={[styles.label, selected && styles.activeLabel]}>{item.label}</Text>
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
  },
  pressed: {
    opacity: 0.68,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  activeIcon: {
    transform: [{ translateY: -1 }],
  },
  label: {
    color: '#7d8cad',
    fontFamily: fontFamily.medium,
    fontSize: 9,
  },
  activeLabel: {
    color: colors.primary,
    fontFamily: fontFamily.bold,
  },
});
