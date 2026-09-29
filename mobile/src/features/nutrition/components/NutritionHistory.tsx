import { t } from '@/i18n/core';
import { dayInitials } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { localizeLabel, getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { Button } from '@/components/Button';
import { Calendar } from '@/components/Calendar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { colors } from '@/theme/colors';
import { foodById, goals } from '../data';
import type { Meal } from '../types';
import { dateFromKey, localDate, mealsInPeriod, shiftedDate, totals } from '../utils';
import { CalorieCard, Heading, MacroSummary, MealList, number, s } from './NutritionUI';

export function NutritionHistory({ meals, onSelect, notify, goalReady }: { meals: Meal[]; onSelect: (meal: Meal) => void; notify: (message: string) => void; goalReady: boolean }) {
  useLanguage();
  const [date, setDate] = useState(localDate()); const [period, setPeriod] = useState('day'); const [calendar, setCalendar] = useState(false);
  const selected = mealsInPeriod(meals, date, period); const value = totals(selected.flatMap(meal => meal.items), foodById);
  const start = shiftedDate(date, -(dateFromKey(date).getDay() + 6) % 7);
  const dayCount = period === 'day' ? 1 : period === 'week' ? 7 : new Date(dateFromKey(date).getFullYear(), dateFromKey(date).getMonth() + 1, 0).getDate();
  const recent = meals.filter(meal => meal.date >= shiftedDate(date, -6) && meal.date <= date);
  const loggedDays = new Set(recent.map(meal => meal.date)).size;
  async function share() {
    try { await Share.share({ message: t("Nutrition · {p0} · {p1}\n{p2} kcal · P {p3} g · G {p4} g · L {p5} g\n{p6}", { p0: date, p1: period === 'day' ? 'Journée' : period === 'week' ? 'Semaine' : 'Mois', p2: number(value.calories), p3: number(value.protein), p4: number(value.carbs), p5: number(value.fat), p6: selected.map(meal => `${meal.date} ${meal.time} · ${meal.moment} : ${number(totals(meal.items, foodById).calories)} kcal`).join('\n') }) }); }
    catch { notify('Le partage n’est pas disponible sur cet appareil.'); }
  }
  return <>
    <TabSelector value={period} onChange={setPeriod} items={[{ value: 'day', label: 'Jour' }, { value: 'week', label: 'Semaine' }, { value: 'month', label: 'Mois' }]} />
    <View style={[s.row, { justifyContent: 'space-between' }]}><IconButton accessibilityLabel={localizeLabel("Période précédente")} icon={<Symbol name="back" />} onPress={() => setDate(shiftedDate(date, period === 'month' ? -dateFromKey(date).getDate() : -7))} /><Button text={dateFromKey(date).toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' })} variant="secondary" onPress={() => setCalendar(!calendar)} /><IconButton accessibilityLabel={localizeLabel("Période suivante")} icon={<Symbol name="chevron" />} onPress={() => { const next = dateFromKey(date); if (period === 'month') { next.setMonth(next.getMonth() + 1, 1); setDate(localDate(next)); } else setDate(shiftedDate(date, 7)); }} /></View>
    {calendar ? <Calendar selectedDate={dateFromKey(date)} onSelectDate={value => { setDate(localDate(value)); setCalendar(false); }} /> : null}
    {period !== 'month' ? <View style={[s.row, { gap: 4 }]}>{Array.from({ length: 7 }, (_, i) => { const key = shiftedDate(start, i); return <Button key={key} text={`${dayInitials()[i]}\n${dateFromKey(key).getDate()}`} variant={key === date ? 'primary' : 'secondary'} radius={16} backgroundColor={key === date ? undefined : colors.surface} containerStyle={{ flex: 1, minWidth: 0 }} style={{ paddingHorizontal: 0, minWidth: 0, minHeight: 0, aspectRatio: 1 }} textStyle={{ fontSize: 11, textAlign: 'center' }} onPress={() => setDate(key)} />; })}</View> : null}
    <CalorieCard value={value} target={goalReady ? goals.calories * dayCount : undefined} label={period === 'day' ? dateFromKey(date).toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' }) : period === 'week' ? 'Bilan de la semaine' : 'Bilan du mois'}><MacroSummary value={value} /></CalorieCard>
    <Heading>Repas enregistrés</Heading>
    {selected.length ? <MealList meals={selected} onSelect={onSelect} showDate={period !== 'day'} /> : <EmptyState title="Aucun repas enregistré" description="Les repas ajoutés au journal apparaîtront ici." />}
    <Card style={s.card}><Text style={s.muted}>Moyenne sur les 7 derniers jours</Text><Text style={s.heading}>{loggedDays ? number(totals(recent.flatMap(meal => meal.items), foodById).calories / loggedDays) : '—'} kcal</Text><Text style={s.small}>{loggedDays} jour{loggedDays > 1 ? 's' : ''} renseigné{loggedDays > 1 ? 's' : ''} · les jours sans saisie ne sont pas comptés</Text></Card>
    <Button text={period === 'day' ? 'Exporter la journée' : 'Exporter la période'} variant="outline" textColor={colors.primary} onPress={() => void share()} />
  </>;
}
