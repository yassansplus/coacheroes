import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, gradients } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const fullDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

type WeekdaySelectorProps = { value: number[]; onChange: (value: number[]) => void; disabled?: boolean };

export function WeekdaySelector({ value, onChange, disabled = false }: WeekdaySelectorProps) {
  return <View style={styles.row}>{weekdays.map((day, index) => {
    const selected = value.includes(index);
    return <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={fullDays[index]}
      aria-checked={selected} aria-disabled={disabled}
      accessibilityState={{ checked: selected, disabled }} disabled={disabled} style={styles.day}
      onPress={() => { void Haptics.selectionAsync().catch(() => undefined);
        onChange(selected ? value.filter(item => item !== index) : [...value, index].sort()); }}>
      <View style={styles.circle}>
        {selected ? <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} /> : null}
        <Text style={[styles.letter, selected && styles.selected]}>{day[0]}</Text>
      </View><Text style={styles.label}>{day}</Text>
    </Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 }, day: { flex: 1, alignItems: 'center', gap: 7, minHeight: 55 },
  circle: { width: '100%', maxWidth: 44, aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    borderRadius: 100, backgroundColor: colors.primarySurface, overflow: 'hidden' },
  letter: { color: colors.text, fontFamily: fontFamily.semiBold, fontSize: 13 },
  selected: { color: colors.white }, label: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 10 },
});
