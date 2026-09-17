import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Card } from '@/components/Card';
import { resolveColor, type AppColor } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type SelectableCardProps = {
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
  onPress: () => void;
  selected: boolean;
  selectedBackgroundColor?: AppColor;
  style?: StyleProp<ViewStyle>;
  title?: string;
};

/**
 * Carte de sélection contrôlée. Elle porte la sémantique checkbox afin de
 * pouvoir être utilisée pour une ou plusieurs récompenses sélectionnables.
 */
export function SelectableCard({
  description,
  disabled = false,
  icon,
  onPress,
  selected,
  selectedBackgroundColor = 'successSurface',
  style,
  title,
}: SelectableCardProps) {
  const selectedBackground = resolveColor(selectedBackgroundColor);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && !disabled && styles.pressed, style]}
    >
      <Card style={[styles.card, selected && { backgroundColor: selectedBackground }]}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  pressed: {
    opacity: 0.82,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 210,
    overflow: 'hidden',
    padding: 16,
    position: 'relative',
  },
  icon: {
    alignItems: 'center',
    height: 92,
    justifyContent: 'center',
    marginBottom: 10,
    width: 92,
  },
  title: {
    color: '#141b41',
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  description: {
    color: '#6073a4',
    fontFamily: fontFamily.medium,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
    textAlign: 'center',
  },
});
