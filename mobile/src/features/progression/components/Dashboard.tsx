import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { TrendChart } from '@/components/charts/TrendChart';
import { colors } from '@/theme/colors';
import type { ProgressPage, Measurement, WeightEntry, Session } from '../types';
import { dateLabel, daysBetween, movingAverage, number, startDate, withinDays } from '../data';
import { Change, Metric, Row, TileIcon } from './UI';
import { s } from './styles';

export function Dashboard({ onPage, weights, measures, sessions, period, onPeriod, onSleep, onStrength, photoCount }: { onPage: (page: ProgressPage) => void; weights: WeightEntry[]; measures: Measurement[]; sessions: Session[]; period: number; onPeriod: () => void; onSleep: () => void; photoCount: number; onStrength: (exercise: string) => void }) {
  const latest = weights[weights.length - 1];
  const average = movingAverage(weights).slice(-1)[0].value;
  const lastMeasure = measures[measures.length - 1];
  const filtered = withinDays(sessions, period, latest.date);
  const workouts = filtered.filter(item => item.sport !== 'rest');
  const completed = workouts.filter(item => !item.missed).length;
  const day = daysBetween(startDate, latest.date) + 1;
  const trend = withinDays(movingAverage(weights), period, latest.date).filter((_, index) => index % 7 === 0).slice(-7);
  return <>
    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><Text style={s.title}>Progression</Text><Button text={period === 365 ? 'Depuis le début ⌄' : `${period} derniers jours ⌄`} variant="secondary" backgroundColor={colors.surface} radius={16} style={{ minHeight: 36, paddingHorizontal: 12 }} textStyle={{ fontSize: 11 }} onPress={onPeriod} /></View>
    <Card style={s.card}><View style={s.row}><View style={s.grow}><Text style={s.heading}>Transformation</Text><Text style={[s.value, { marginTop: 6, fontSize: 32 }]}>Jour {day} <Text style={{ color: colors.textMuted }}>/ 365</Text></Text></View><TileIcon glyph="calendar" /></View><View style={s.row}><View style={s.grow}><ProgressBar progress={day / 365 * 100} height={12} /></View><Text style={s.body}>{Math.round(day / 365 * 100)} %</Text></View></Card>
    <View style={s.wrap}><Metric title="Poids moyen" value={`${number(average)} kg`} icon={<TileIcon name="scale" />} change={`${number(average - movingAverage(weights).slice(-8)[0].value)} kg cette semaine`} smallChange onPress={() => onPage('weight')} /><Metric title="Tour de taille" value={`${number(lastMeasure.waist)} cm`} icon={<TileIcon name="tape" tone="green" />} change={`${number(lastMeasure.waist - measures[0].waist)} cm`} smallChange onPress={() => onPage('measurements')} /></View>
    <View style={s.wrap}><Metric title="Entraînements" value={`${completed}`} icon={<TileIcon name="dumbbell" tone="purple" />} change={`${Math.round(completed / Math.max(1, workouts.length) * 100)} % réalisés`} smallChange onPress={() => onPage('attendance')} /><Metric title="Sommeil moyen" value="6 h 12" icon={<TileIcon name="moon" />} change="↑ +38 min" smallChange onPress={onSleep} /></View>
    <Card style={s.card}><View style={s.row}><Text style={[s.heading, s.grow]}>Performances</Text><Pressable accessibilityRole="button" onPress={() => onPage('strength')}><Text style={[s.label, { color: colors.primary }]}>Voir toutes ›</Text></Pressable></View><Row title="Développé couché" icon={<TileIcon name="dumbbell" size={32} />} trailing={<Change text="+15 kg" />} onPress={() => onStrength('bench')} /><Row title="Tractions" icon={<TileIcon name="dumbbell" tone="purple" size={32} />} trailing={<Change text="4 → 8" tone="blue" />} onPress={() => onStrength('pullups')} /><Row title="Boxe" icon={<TileIcon name="boxing" tone="red" size={32} />} trailing={<Change text="168 → 204" tone="blue" />} onPress={() => onPage('boxing')} /></Card>
    <Card style={s.card}><Text style={s.heading}>Évolution globale</Text><Text style={s.small}>Indices de tendance · données de démonstration</Text><TrendChart hideAxis height={150} series={[
      { label: 'Poids', color: colors.accent, points: trend.map((item, i) => ({ label: `S${i + 1}`, value: 100 * (item.value - Math.min(...weights.map(entry => entry.value))) / Math.max(1, Math.max(...weights.map(entry => entry.value)) - Math.min(...weights.map(entry => entry.value))), detail: `${dateLabel(item.date)} · ${number(item.value)} kg` })) },
      { label: 'Force', color: colors.primary, points: trend.map((_, i) => ({ label: `S${i + 1}`, value: 30 + i * 7 })) },
      { label: 'Assiduité', color: colors.success, points: trend.map((_, i) => ({ label: `S${i + 1}`, value: sessions.filter(session => session.date <= trend[i].date && session.sport !== 'rest' && !session.missed).length / Math.max(1, sessions.filter(session => session.sport !== 'rest').length) * 60 })) },
    ]} /></Card>
    <Card style={s.card}><Row title="Photos de progression" subtitle={`${photoCount} prises de vue · Face, profil et dos`} icon={<TileIcon glyph="image" tone="purple" />} onPress={() => onPage('photos')} /><Button text="Voir mes photos" variant="outline" onPress={() => onPage('photos')} /></Card>
  </>;
}
