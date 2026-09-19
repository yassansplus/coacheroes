import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Card } from '@/components/Card';
import { Symbol } from '@/components/Symbol';
import { colors, gradients, resolveColor, type AppColor } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type ChoiceCardProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  role?: 'radio' | 'checkbox';
  layout?: 'tile' | 'row' | 'chip';
  indicatorPosition?: 'top' | 'bottom' | 'leading' | 'trailing';
  indicatorSize?: number;
  selectedColor?: AppColor;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
};

/** A selectable surface with an explicit radio/checkbox indicator. */
export function ChoiceCard({ title, description, icon, selected, onPress, disabled = false,
  role = 'checkbox', layout = 'tile', indicatorPosition = 'top', selectedColor = 'primary',
  style, contentStyle, titleStyle, descriptionStyle, indicatorSize = 23 }: ChoiceCardProps) {
  const indicator = <View style={[styles.indicator, { width: indicatorSize, height: indicatorSize, borderRadius: indicatorSize / 2 }, selected && { borderColor: resolveColor(selectedColor) }]}>
    {selected ? <LinearGradient colors={gradients.primary} style={styles.selectedIndicator}>
      {role === 'radio' && layout === 'row' ? <View style={styles.dot} /> : <Symbol name="check" color="white" size={Math.round(indicatorSize * 0.65)} />}
    </LinearGradient> : null}
  </View>;
  return <Pressable accessibilityLabel={title} accessibilityRole={role} accessibilityState={{ checked: selected, disabled }}
    aria-checked={selected} aria-disabled={disabled}
    disabled={disabled} onPress={() => { void Haptics.selectionAsync().catch(() => undefined); onPress(); }}
    style={({ pressed }) => [styles.pressable, pressed && styles.pressed, disabled && styles.disabled, style]}>
    <Card style={[styles.card, layout !== 'tile' && styles.row, contentStyle, selected && styles.selected,
      selected && { borderColor: resolveColor(selectedColor) }]}>
      {selected ? <LinearGradient colors={gradients.selection} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      {indicatorPosition === 'top' ? <View style={styles.topIndicator}>{indicator}</View> : null}
      {indicatorPosition === 'leading' ? indicator : null}
      {icon ? <View style={layout === 'tile' ? styles.tileIcon : styles.rowIcon}>{icon}</View> : null}
      <View style={layout !== 'tile' ? styles.rowCopy : undefined}>
        <Text style={[styles.title, layout === 'chip' && styles.chipTitle, titleStyle]}>{title}</Text>
        {description ? <Text style={[styles.description, descriptionStyle]}>{description}</Text> : null}
      </View>
      {indicatorPosition === 'bottom' ? <View style={styles.bottomIndicator}>{indicator}</View> : null}
      {indicatorPosition === 'trailing' ? indicator : null}
    </Card>
  </Pressable>;
}

const styles = StyleSheet.create({
  pressable: { minWidth: 0 }, pressed: { opacity: 0.8 }, disabled: { opacity: 0.45 },
  card: { flex: 1, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.surface, padding: 18, gap: 10 },
  selected: { backgroundColor: colors.primarySurface },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 13, gap: 12 },
  rowCopy: { flex: 1, minWidth: 0 }, rowIcon: { alignItems: 'center', justifyContent: 'center' },
  tileIcon: { alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  title: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 21, color: colors.text },
  chipTitle: { fontFamily: fontFamily.semiBold, fontSize: 12, lineHeight: 17 },
  description: { fontFamily: fontFamily.regular, fontSize: 9, lineHeight: 15, color: colors.textSecondary, marginTop: 5 },
  indicator: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: colors.textMuted,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  selectedIndicator: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.white },
  topIndicator: { position: 'absolute', right: 12, top: 12, zIndex: 1 },
  bottomIndicator: { alignSelf: 'center', marginTop: 4 },
});
