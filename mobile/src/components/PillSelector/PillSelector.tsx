import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export type PillSelectorItem = {
  label: string;
  value: string;
};

type PillSelectorProps = {
  variant?: 'outline' | 'filled';
  itemStyle?: StyleProp<ViewStyle>;
  items: PillSelectorItem[];
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  value: string;
};

export function PillSelector({ items, onChange, style, value, variant = 'outline', itemStyle }: PillSelectorProps) {
  const handleChange = (nextValue: string) => {
    if (nextValue !== value) {
      void Haptics.selectionAsync().catch(() => undefined);
    }

    onChange(nextValue);
  };

  return (
    <View style={[styles.list, style]}>
      {items.map((item) => {
        const isSelected = item.value === value;
        const label = <Text style={[styles.label, isSelected && styles.activeLabel, isSelected && variant === 'filled' && { color: colors.white }]}>{item.label}</Text>;

        return (
          <Pressable
            key={item.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            onPress={() => handleChange(item.value)}
            style={itemStyle}
          >
            {isSelected ? (
              <LinearGradient
                colors={gradients.primary}
                end={{ x: 1, y: 0.5 }}
                start={{ x: 0, y: 0.5 }}
                style={styles.activeBorder}
              >
                {variant === 'filled' ? <View style={[styles.activeBackground, { backgroundColor: 'transparent' }]}>{label}</View> : <LinearGradient
                  colors={['#f4faff', '#fdfaff']}
                  end={{ x: 1, y: 0.5 }}
                  start={{ x: 0, y: 0.5 }}
                  style={styles.activeBackground}
                >
                  {label}
                </LinearGradient>}
              </LinearGradient>
            ) : (
              <View style={styles.inactivePill}>{label}</View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeBorder: {
    borderRadius: 999,
    padding: 1,
  },
  activeBackground: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  inactivePill: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  label: {
    color: '#6073a4',
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  activeLabel: {
    color: colors.primary,
  },
});
