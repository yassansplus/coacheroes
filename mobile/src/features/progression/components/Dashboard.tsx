import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { useLanguage } from '@/i18n/useLanguage';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { TrendChart } from '@/components/charts/TrendChart';
import { colors } from '@/theme/colors';
import type { ProgressData, ProgressPage } from '../types';
import { dateLabel, dayKey, daysBetween, number, withinDays } from '../data';
import { Change, Metric, Row, TileIcon } from './UI';
import { s } from './styles';

const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const show = (value: number | null, unit: string) => value === null ? '—' : `${number(value)} ${unit}`;
export function Dashboard({ onPage, period, onPeriod, onSleep, onStrength, data }: {
  onPage: (page: ProgressPage) => void; period: number; onPeriod: () => void; onSleep: () => void;
  onStrength: (exercise: string) => void; data: ProgressData;
}) {
  useLanguage();
  const { weights, measures, sessions, photos, sleep, exercises, block, startDate } = data;
  const today = dayKey(new Date());
  const recent = withinDays(weights, 7, today), previous = weights.filter(item => { const age = daysBetween(item.date, today); return age >= 7 && age < 14; });
  const mean = avg(recent.map(item => item.value)), prior = avg(previous.map(item => item.value));
  const waists = measures.filter(item => item.waist !== null), waist = waists.at(-1)?.waist ?? null;
  const days = period === 365 ? Infinity : period;
  const due = withinDays(sessions, days, today).filter(item => item.sport !== 'rest' && item.status !== 'planned' && item.status !== 'in_progress');
  const completed = due.filter(item => item.status === 'completed').length;
  const sleepMean = avg(withinDays(sleep, days, today).map(item => item.minutes));
  const priorSleep = avg(sleep.filter(item => { const age = daysBetween(item.date, today); return age >= period && age < period * 2; }).map(item => item.minutes));
  const base = block?.startedAt.slice(0, 10) ?? startDate;
  const total = block ? Math.max(1, daysBetween(block.startedAt.slice(0, 10), block.endsAt.slice(0, 10))) : null;
  const day = base ? Math.min(total ?? Infinity, Math.max(1, daysBetween(base, today) + 1)) : 0;
  const progress = total ? Math.min(100, day / total * 100) : 0;
  const top = exercises.slice().sort((a, b) => b.points.length - a.points.length).slice(0, 2);
  const boxing = sessions.filter(item => item.sport === 'boxing' && item.status === 'completed');
  const weightPoints = withinDays(weights, days, today), firstWeight = weightPoints[0]?.value;
  const strength = top[0]?.points.filter(item => daysBetween(item.date, today) >= 0 && daysBetween(item.date, today) < days && item.estimatedMax !== null) ?? [];
  const firstStrength = strength[0]?.estimatedMax;
  const attendance = [...new Set(due.map(item => item.date.slice(0, 7)))].map(month => {
    const rows = due.filter(item => item.date.startsWith(month));
    return { label: month, value: rows.filter(item => item.status === 'completed').length / rows.length * 100 };
  });
  return <>
    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}><Text style={s.title}>Progression</Text><Button text={period === 365 ? 'Depuis le début ⌄' : t("{p0} derniers jours ⌄", { p0: period })} variant="secondary" backgroundColor={colors.surface} radius={16} style={{ minHeight: 36, paddingHorizontal: 12 }} textStyle={{ fontSize: 11 }} onPress={onPeriod} /></View>
    <Card style={s.card}><View style={s.row}><View style={s.grow}><Text style={s.heading}>Transformation</Text><Text style={[s.value, { marginTop: 6, fontSize: 32 }]}>Jour {day || '—'} <Text style={{ color: colors.textMuted }}>/ {total ?? '—'}</Text></Text></View><TileIcon glyph="calendar" /></View><View style={s.row}><View style={s.grow}><ProgressBar progress={progress} height={12} /></View><Text style={s.body}>{Math.round(progress)} %</Text></View></Card>
    <View style={s.wrap}><Metric title="Poids moyen" value={show(mean, 'kg')} icon={<TileIcon name="scale" />} change={mean !== null && prior !== null ? t("{p0} kg cette semaine", { p0: number(mean - prior) }) : undefined} smallChange onPress={() => onPage('weight')} /><Metric title="Tour de taille" value={show(waist, 'cm')} icon={<TileIcon name="tape" tone="green" />} change={waist !== null && waists.length > 1 ? t("{p0} cm", { p0: number(waist - waists[0].waist!) }) : undefined} smallChange onPress={() => onPage('measurements')} /></View>
    <View style={s.wrap}><Metric title="Entraînements" value={String(completed)} icon={<TileIcon name="dumbbell" tone="purple" />} change={due.length ? t("{p0} % réalisés", { p0: Math.round(completed / due.length * 100) }) : undefined} smallChange onPress={() => onPage('attendance')} /><Metric title="Sommeil moyen" value={sleepMean === null ? '—' : t("{p0} h {p1}", { p0: Math.floor(sleepMean / 60), p1: String(Math.round(sleepMean % 60)).padStart(2, '0') })} icon={<TileIcon name="moon" />} change={sleepMean !== null && priorSleep !== null ? t("{p0} min", { p0: Math.round(sleepMean - priorSleep) }) : undefined} smallChange onPress={onSleep} /></View>
    <Card style={s.card}><View style={s.row}><Text style={[s.heading, s.grow]}>Performances</Text><Pressable accessibilityRole="button" onPress={() => onPage('strength')}><Text style={[s.label, { color: colors.primary }]}>Voir toutes ›</Text></Pressable></View>{top.map(item => {
      const first = item.points[0], last = item.points.at(-1);
      const change = first && last && item.points.length > 1 ? item.unit === 'kg' ? t("{p0} kg", { p0: number(last.weight - first.weight) }) : `${first.reps} → ${last.reps}` : '—';
      return <Row key={item.id} title={item.title} icon={<TileIcon name="dumbbell" size={32} />} trailing={<Change text={change} />} onPress={() => onStrength(item.id)} />;
    })}{boxing.length ? <Row title="Boxe" icon={<TileIcon name="boxing" tone="red" size={32} />} trailing={<Change text={t("{p0} séances", { p0: boxing.length })} tone="blue" />} onPress={() => onPage('boxing')} /> : null}{!top.length && !boxing.length ? <Text style={s.small}>Tes performances apparaîtront après tes premières séances.</Text> : null}</Card>
    <Card style={s.card}><Text style={s.heading}>Évolution globale</Text><Text style={s.small}>Poids et force indexés · assiduité en %</Text><TrendChart hideAxis height={150} series={[
      { label: 'Poids', color: colors.accent, points: firstWeight ? weightPoints.map(item => ({ label: dateLabel(item.date, true), value: item.value / firstWeight * 100, detail: t("{p0} · {p1} kg", { p0: dateLabel(item.date), p1: number(item.value) }) })) : [] },
      { label: 'Force', color: colors.primary, points: firstStrength ? strength.map(item => ({ label: dateLabel(item.date, true), value: item.estimatedMax! / firstStrength * 100 })) : [] },
      { label: 'Assiduité', color: colors.success, points: attendance },
    ]} /></Card>
    <Card style={s.card}><Row title="Photos de progression" subtitle={t("{p0} prises de vue · Face, profil et dos", { p0: photos.length })} icon={<TileIcon glyph="image" tone="purple" />} onPress={() => onPage('photos')} /><Button text="Voir mes photos" variant="outline" onPress={() => onPage('photos')} /></Card>
  </>;
}
