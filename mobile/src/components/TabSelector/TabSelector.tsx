import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export type TabSelectorItem = {
  label: string;
  value: string;
};

type TabSelectorProps = {
  items: TabSelectorItem[];
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  value: string;
};

export function TabSelector({ items, onChange, style, value }: TabSelectorProps) {
  const indicatorOffset = useRef(new Animated.Value(0)).current;
  const previousValue = useRef(value);
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex = Math.max(0, items.findIndex((item) => item.value === value));
  const indicatorWidth = items.length ? Math.max(0, (containerWidth - 8) / items.length) : 0;

  useEffect(() => {
    const shouldTriggerHaptic = previousValue.current !== value && indicatorWidth > 0;
    previousValue.current = value;
    const animation = Animated.spring(indicatorOffset, {
      toValue: activeIndex * indicatorWidth,
      bounciness: 6,
      speed: 18,
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      if (!finished || !shouldTriggerHaptic) {
        return;
      }

      void Haptics.selectionAsync().catch(() => undefined);
    });

    return animation.stop;
  }, [activeIndex, indicatorOffset, indicatorWidth, value]);

  return (
    <View
      onLayout={({ nativeEvent }) => {
        setContainerWidth(nativeEvent.layout.width);
      }}
      style={[styles.container, style]}
    >
      {indicatorWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            {
              transform: [{ translateX: indicatorOffset }],
              width: indicatorWidth,
            },
          ]}
        >
          <LinearGradient
            colors={gradients.tabPrimary}
            end={{ x: 1, y: 0.5 }}
            locations={[0, 0.62, 1]}
            start={{ x: 0, y: 0.5 }}
            style={styles.indicatorGradient}
          />
        </Animated.View>
      ) : null}

      {items.map((item) => {
        const isSelected = item.value === value;

        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(item.value)}
            style={styles.tab}
          >
            <Text style={[styles.label, isSelected ? styles.activeLabel : styles.inactiveLabel]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: 'row',
    minHeight: 48,
    overflow: 'hidden',
    padding: 4,
  },
  indicator: {
    bottom: 4,
    left: 4,
    position: 'absolute',
    top: 4,
  },
  indicatorGradient: {
    borderRadius: 20,
    flex: 1,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    zIndex: 1,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
  },
  activeLabel: {
    color: '#ffffff',
  },
  inactiveLabel: {
    color: '#6073a4',
  },
});
