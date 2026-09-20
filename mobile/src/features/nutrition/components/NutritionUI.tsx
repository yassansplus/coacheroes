import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useMetricMotion } from '@/hooks/useMetricMotion';
import { Motion } from '@/components/Motion';
import { Card } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { Symbol } from '@/components/Symbol';
import type { IllustrationName } from '@/config/illustrations';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { foodById, goals, momentIcons } from '../data';
import type { Ingredient, Meal, Nutrients } from '../types';
import { remaining, totals } from '../utils';

export const macros = [
  { key: 'protein', label: 'Protéines', icon: 'chicken', color: colors.success, background: colors.successSurface },
  { key: 'carbs', label: 'Glucides', icon: 'rice', color: colors.accent, background: colors.accentSurface },
  { key: 'fat', label: 'Lipides', icon: 'peanuts', color: colors.warning, background: colors.warningSurface },
] as const;
export const number = (value: number) => Math.round(value).toLocaleString('fr-FR');
export function Heading({ children }: { children: ReactNode }) { return <Text style={s.heading}>{children}</Text>; }
export function FoodIcon({ name, background = colors.primarySurface, size = 46 }: { name: string; background?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}><Illustration name={name as IllustrationName} size={size * 0.78} /></View>;
}
export function NutritionRow({ title, subtitle, icon, onPress, last = false, trailing }: { title: string; subtitle?: string; icon?: ReactNode; onPress: () => void; last?: boolean; trailing?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [s.listRow, last && { borderBottomWidth: 0 }, pressed && { opacity: 0.7 }]}>
    {icon}<View style={{ flex: 1, minWidth: 0 }}><Text style={s.rowTitle}>{title}</Text>{subtitle ? <Text style={s.muted}>{subtitle}</Text> : null}</View>
    {trailing ? <Text style={s.muted}>{trailing}</Text> : null}<Symbol name="chevron" color="textSecondary" size={19} />
  </Pressable>;
}
export function MacroSummary({ value }: { value: Nutrients }) { return <View style={s.summaryMacros}>{macros.map(macro => <View key={macro.key} style={{ flex: 1, minWidth: 0, gap: 5, alignItems: 'center' }}><View style={[s.row, { gap: 5 }]}><Illustration name={macro.icon} size={25} /><Text style={s.rowTitle}>{number(value[macro.key])} g</Text></View><Text style={s.small}>{macro.label.toLowerCase()}</Text></View>)}</View>; }
export function CalorieCard({ value, target, label = 'Calories', children }: { value: Nutrients; target?: number; label?: string; children?: ReactNode }) {
  const { width } = useWindowDimensions();
  const [calories, protein, carbs, fat] = useMetricMotion([value.calories, value.protein, value.carbs, value.fat], { duration: target ? 1800 : 600, haptic: target ? 'rain' : false });
  const shown = { calories, protein, carbs, fat };
  return <Card style={s.card}><View style={s.row}><FoodIcon name="flame" background={colors.energySurface} size={width < 350 ? 40 : 50} /><View style={{ flex: 1, minWidth: 0 }}><Text style={s.muted}>{label}</Text><Text style={[s.big, { fontSize: width < 350 ? 27 : 37 }]}>{number(calories)}<Text style={[s.calorieUnit, { fontSize: width < 350 ? 13 : 17 }]}> {target ? `/ ${number(target)}` : ''} kcal</Text></Text></View></View>
    {target ? <ProgressBar progress={calories / target * 100} animated={false} height={18} gradientColors={[colors.energy, colors.energy]} /> : <MacroSummary value={shown} />}{children}</Card>;
}
export function MacroCards({ value }: { value: Nutrients }) {
  const amounts = useMetricMotion(macros.map(macro => value[macro.key]), { duration: 1100, delay: 160, haptic: 'arrival' });
  const { width } = useWindowDimensions(); const size = Math.min(124, Math.max(66, (Math.min(width, 680) - 84) / 3));
  return <View style={[s.row, { alignItems: 'stretch', gap: 8 }]}>{macros.map((macro, index) => <Card key={macro.key} style={s.macroCard}><View style={[s.row, { gap: 3, justifyContent: 'center', flexWrap: 'wrap' }]}><FoodIcon name={macro.icon} background={macro.background} size={32} /><Text style={s.small}>{macro.label}</Text></View><ProgressRing size={size} strokeWidth={7} progress={amounts[index] / goals[macro.key] * 100} color={macro.color} trackColor={macro.background}><Text style={s.macroValue}>{number(amounts[index])}</Text><Text style={s.small}>/ {goals[macro.key]} g</Text></ProgressRing></Card>)}</View>;
}
export function FoodList({ items, onSelect, footer }: { items: Ingredient[]; onSelect: (index: number) => void; footer?: ReactNode }) {
  return <Card style={s.list}>{items.map((item, index) => { const food = foodById[item.foodId]; return <NutritionRow key={item.id} last={index === items.length - 1 && !footer} title={food.name} subtitle={`${number(item.amount)} ${food.baseUnit} · ${number(totals([item], foodById).calories)} kcal`} icon={<FoodIcon name={food.icon} background={index % 2 ? colors.accentSurface : colors.energySurface} />} onPress={() => onSelect(index)} />; })}{footer ? <View style={{ paddingTop: 12 }}>{footer}</View> : null}</Card>;
}
export function MealList({ meals, onSelect, showDate = false }: { meals: Meal[]; onSelect: (meal: Meal) => void; showDate?: boolean }) {
  return <Card style={s.list}>{meals.map((meal, index) => <Motion key={meal.id} delay={Math.min(index, 5) * 45}><NutritionRow last={index === meals.length - 1} title={meal.moment} subtitle={`${showDate ? `${meal.date.split('-').reverse().slice(0, 2).join('/')} · ` : ''}${meal.time} · ${number(totals(meal.items, foodById).calories)} kcal`} icon={<FoodIcon name={momentIcons[meal.moment]} background={[colors.primarySurface, colors.energySurface, colors.accentSurface, colors.successSurface][index % 4]} />} onPress={() => onSelect(meal)} /></Motion>)}</Card>;
}
export function RemainingMacros({ value }: { value: Nutrients }) { const amounts = useMetricMotion(macros.map(macro => value[macro.key]), { duration: 1000 }); return <>{macros.map((macro, index) => <Card key={macro.key} style={s.card}><View style={s.row}><FoodIcon name={macro.icon} background={macro.background} /><View style={{ flex: 1, gap: 5 }}><Text style={s.rowTitle}>{macro.label}</Text><View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><Text style={[s.muted, { color: macro.color }]}>{remaining(amounts[index], goals[macro.key])} g restants</Text><Text style={s.small}>{number(amounts[index])} / {goals[macro.key]} g</Text></View><ProgressBar animated={false} progress={amounts[index] / goals[macro.key] * 100} gradientColors={[macro.color, macro.color]} height={9} /></View></View></Card>)}</>; }
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.onboardingBackground },
  body: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18, gap: 14, paddingTop: 12, paddingBottom: 30 },
  header: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { padding: 16, gap: 14 }, list: { padding: 12 },
  heading: { fontFamily: fontFamily.bold, fontSize: 21, color: colors.text, marginTop: 3 },
  hero: { fontFamily: fontFamily.extraBold, fontSize: 30, lineHeight: 37, color: colors.text, marginVertical: 12 },
  muted: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  small: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textSecondary },
  rowTitle: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.text },
  big: { fontFamily: fontFamily.extraBold, fontSize: 37, color: colors.text },
  calorieUnit: { fontFamily: fontFamily.semiBold, fontSize: 19, color: colors.textSecondary },
  listRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 67, paddingVertical: 9, borderBottomWidth: 1, borderColor: colors.border },
  summaryMacros: { flexDirection: 'row', gap: 6, borderTopWidth: 1, borderColor: colors.border, paddingTop: 14 },
  macroCard: { flex: 1, minWidth: 0, padding: 9, gap: 8, borderRadius: 20 },
  macroValue: { fontFamily: fontFamily.bold, fontSize: 23, color: colors.text },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 7, backgroundColor: colors.energySurface, borderRadius: 30 },
  actions: { gap: 10, marginTop: 3 },
});
