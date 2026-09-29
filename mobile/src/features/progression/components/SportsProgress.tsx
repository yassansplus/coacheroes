import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { localizeLabel, getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/Button';
import { Calendar } from '@/components/Calendar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TrendChart } from '@/components/charts/TrendChart';
import { colors } from '@/theme/colors';
import { dateLabel, dayKey, daysBetween, number, withinDays } from '../data';
import type { BoxingTest, ExerciseTrend, Session } from '../types';
import { Change, Metric, Row, TileIcon } from './UI';
import { s } from './styles';

export function StrengthProgress({ exerciseId, exercises, onExercise, onHistory }: { exerciseId: string; exercises: ExerciseTrend[]; onExercise: () => void; onHistory: (title: string, lines: string[]) => void }) {
  useLanguage();
  const [metric, setMetric] = useState('max'), [period, setPeriod] = useState('4');
  const exercise = exercises.find(item => item.id === exerciseId) ?? exercises[0];
  if (!exercise) return <><EmptyState title="Pas encore de performance" description="Tes séries terminées apparaîtront ici." /><Button text="Changer d’exercice" variant="outline" onPress={onExercise} /></>;
  const bodyweight = exercise.unit === 'rep.';
  const points = exercise.points;
  const selectedMetric = metric === 'max' && !bodyweight && points.every(point => point.estimatedMax === null) ? 'load' : metric;
  const best = points.reduce((winner, point) => !winner || (bodyweight ? point.reps > winner.reps : point.weight > winner.weight) ? point : winner, undefined as typeof points[number] | undefined);
  const latest = points.at(-1), first = points[0];
  const today = dayKey(new Date()), month = withinDays(points, 30, today);
  const monthlyVolume = month.reduce((sum, point) => sum + (bodyweight ? point.reps : point.volume), 0);
  const title = selectedMetric === 'max' ? bodyweight ? 'Répétitions maximales' : '1RM estimé' : selectedMetric === 'load' ? bodyweight ? 'Meilleure série' : 'Charge' : 'Volume';
  const unit = bodyweight ? 'rép.' : 'kg';
  const value = (point: typeof points[number]) => selectedMetric === 'volume' ? bodyweight ? point.reps : point.volume : bodyweight ? point.reps : selectedMetric === 'max' ? point.estimatedMax : point.weight;
  const graph = points.filter(point => daysBetween(point.date, today) < Number(period) * 31 && daysBetween(point.date, today) >= 0)
    .map(point => ({ label: dateLabel(point.date, true), value: value(point), detail: dateLabel(point.date) }))
    .filter((point): point is { label: string; value: number; detail: string } => point.value !== null);
  const history = points.map(point => `${dateLabel(point.date)} · ${point.baseline ? 'Référence de départ' : bodyweight ? t("{p0} rép.", { p0: point.reps }) : t("{p0} kg × {p1}", { p0: number(point.weight), p1: point.reps })} · ${point.baseline ? `${number(bodyweight ? point.reps : point.weight)} ${bodyweight ? 'rép.' : 'kg'}` : bodyweight ? 'Poids du corps' : t("{p0} kg de volume", { p0: number(point.volume) })}`);
  return <><Card style={s.card}><Row title={exercise.title} icon={<TileIcon name="dumbbell" size={50} />} onPress={onExercise} /></Card><TabSelector value={selectedMetric} onChange={setMetric} items={[{ value: 'max', label: bodyweight ? 'Répétitions' : '1RM estimé' }, { value: 'load', label: bodyweight ? 'Meilleure série' : 'Charge' }, { value: 'volume', label: 'Volume' }]} />
    <View style={[s.row, { alignItems: 'stretch', gap: 8 }]}><Metric compact title={bodyweight ? 'Maximum' : '1RM estimé'} value={bodyweight ? t("{p0} rép.", { p0: best?.reps ?? '—' }) : latest?.estimatedMax ? t("{p0} kg", { p0: number(latest.estimatedMax) }) : '—'} icon={<TileIcon glyph="chart" size={32} />} change={first && latest && (bodyweight || first.estimatedMax !== null && latest.estimatedMax !== null) && first !== latest ? `↑ +${number(bodyweight ? latest.reps - first.reps : latest.estimatedMax! - first.estimatedMax!)}` : undefined} /><Metric compact title="Meilleure série" value={best ? bodyweight ? t("{p0} rép.", { p0: best.reps }) : best.baseline ? t("{p0} kg", { p0: number(best.weight) }) : t("{p0} kg × {p1}", { p0: number(best.weight), p1: best.reps }) : '—'} icon={<TileIcon name="trophy" tone="purple" size={32} />} /><Metric compact title="Volume mensuel" value={month.some(point => !point.baseline) ? `${number(monthlyVolume)} ${bodyweight ? 'rép.' : 'kg'}` : '—'} icon={<TileIcon glyph="layers" tone="green" size={32} />} /></View>
    <Card style={s.card}><Text style={s.heading}>{title}</Text><TabSelector value={period} onChange={setPeriod} items={[{ value: '2', label: '2 mois' }, { value: '4', label: '4 mois' }]} /><TrendChart key={`${exerciseId}-${metric}-${period}`} unit={unit} showValues height={200} series={[{ label: title, color: colors.primary, gradient: true, points: graph }]} /></Card>
    <Card style={s.card}><View style={s.row}><Text style={[s.heading, s.grow]}>Dernières performances</Text><Pressable accessibilityRole="button" onPress={() => onHistory(exercise.title, history.slice().reverse())}><Text style={[s.small, { color: colors.primary }]}>Voir toutes ›</Text></Pressable></View>{history.slice(-3).reverse().map(line => <Row key={line} title={line.split(' · ')[1]} subtitle={line.split(' · ')[2]} icon={<Text style={s.body}>{line.split(' · ')[0]}</Text>} onPress={() => onHistory(exercise.title, [line])} />)}</Card>
    <Button text="Changer d’exercice" variant="outline" onPress={onExercise} />
  </>;
}

export const testValue = (test: BoxingTest) => test.kind === 'Corde' ? `${Math.floor(test.value / 60)}:${String(test.value % 60).padStart(2, '0')}` : String(test.value);
export function BoxingProgress({ sessions, tests, onAdd, onSessions, onHistory }: { sessions: Session[]; tests: BoxingTest[]; onAdd: () => void; onSessions: () => void; onHistory: (title: string, lines: string[]) => void }) {
  useLanguage();
  const [period, setPeriod] = useState('28');
  const today = dayKey(new Date());
  const visible = withinDays(sessions, Number(period), today).filter(item => item.sport === 'boxing');
  const completed = visible.filter(item => item.status === 'completed');
  const due = visible.filter(item => item.status === 'completed' || item.status === 'missed' || item.status === 'abandoned');
  const minutes = completed.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
  const withRounds = completed.filter(item => item.rounds !== null);
  const rounds = Array.from({ length: Number(period) / 7 }, (_, index) => {
    const start = Number(period) / 7 - index - 1;
    const items = withRounds.filter(item => Math.floor(daysBetween(item.date, today) / 7) === start);
    return items.length ? { label: `S${index + 1}`, value: items.reduce((sum, item) => sum + (item.rounds ?? 0), 0) } : null;
  }).filter((item): item is { label: string; value: number } => item !== null);
  return <><TabSelector value={period} onChange={setPeriod} items={[{ value: '28', label: '4 dernières semaines' }, { value: '56', label: '8 semaines' }]} /><View style={s.row}><Metric title="Séances" value={String(completed.length)} icon={<TileIcon name="calendar" />} /><Metric title="Rounds" value={withRounds.length ? `${withRounds.reduce((sum, item) => sum + (item.rounds ?? 0), 0)}${withRounds.length < completed.length ? '+' : ''}` : '—'} icon={<TileIcon name="boxing" tone="purple" />} /></View><View style={s.row}><Metric title="Temps total" value={completed.length ? t("{p0} h {p1}", { p0: Math.floor(minutes / 60), p1: String(minutes % 60).padStart(2, '0') }) : '—'} icon={<TileIcon glyph="clock" />} /><Metric title="Assiduité" value={due.length ? `${Math.round(completed.length / due.length * 100)} %` : '—'} icon={<TileIcon glyph="check" tone="green" />} /></View>
    <Card style={s.card}><Text style={s.heading}>Rounds par semaine</Text><TrendChart key={period} height={175} showValues series={[{ label: 'Rounds', color: colors.primary, gradient: true, kind: 'bar', points: rounds }]} /></Card>
    <Card style={s.card}><Text style={s.heading}>Tests suivis</Text>{(['Sac', 'Corde', 'Sparring'] as const).map(kind => { const entries = tests.filter(item => item.kind === kind); const first = entries[0], last = entries.at(-1); return <Row key={kind} title={kind} subtitle={kind === 'Sac' ? 'frappes en 3 min' : kind === 'Corde' ? 'sans interruption' : 'rounds enregistrés'} icon={<TileIcon name={kind === 'Sac' ? 'punchingBag' : kind === 'Sparring' ? 'boxing' : undefined} glyph="clock" tone={kind === 'Sac' ? 'red' : 'purple'} />} trailing={<Change text={last ? `${first !== last ? `${testValue(first)} → ` : ''}${testValue(last)}` : '—'} tone="blue" />} onPress={() => onHistory(kind, entries.map(item => `${dateLabel(item.date)} · ${testValue(item)} ${kind === 'Sac' ? 'frappes' : kind === 'Sparring' ? 'rounds' : ''}`))} />; })}</Card>
    <View style={s.actions}><Button text="＋ Ajouter un test" onPress={onAdd} /><Button text="Voir les séances" variant="secondary" textColor={colors.primary} onPress={onSessions} /></View>
  </>;
}

export function Attendance({ sessions, onSessions }: { sessions: Session[]; onSessions: (title: string, entries: Session[]) => void }) {
  useLanguage();
  const now = new Date(), today = dayKey(now);
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(now);
  const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay() + 6) % 7);
  const [week, setWeek] = useState(monday);
  const monthly = sessions.filter(item => item.date.startsWith(dayKey(month).slice(0, 7)));
  const planned = monthly.filter(item => item.sport !== 'rest' && (item.status === 'completed' || item.status === 'missed' || item.status === 'abandoned'));
  const complete = planned.filter(item => item.status === 'completed');
  const end = new Date(week); end.setDate(end.getDate() + 6);
  const weekSessions = sessions.filter(item => item.date >= dayKey(week) && item.date <= dayKey(end));
  let streak = 0;
  for (const date of [...new Set(sessions.filter(row => row.sport !== 'rest' && (row.status === 'completed' || row.status === 'missed' || row.status === 'abandoned')).map(row => row.date))].sort().reverse()) {
    if (sessions.some(row => row.date === date && row.sport !== 'rest' && (row.status === 'missed' || row.status === 'abandoned'))) break;
    streak++;
  }
  function changeWeek(delta: number) { setWeek(value => new Date(value.getFullYear(), value.getMonth(), value.getDate() + delta)); }
  const sports = ['strength', 'boxing', ...new Set(weekSessions.map(item => item.sport).filter(sport => !['strength', 'boxing', 'rest'].includes(sport))), 'rest'];
  return <><View style={[s.row, { alignItems: 'stretch', gap: 8 }]}><Metric compact title={month.toLocaleDateString(getLocale(), { month: 'long' })} value={`${complete.length} / ${planned.length}`} icon={<TileIcon glyph="calendar" size={32} />} /><Metric compact title="Taux" value={planned.length ? `${Math.round(complete.length / planned.length * 100)} %` : '—'} icon={<TileIcon glyph="chart" tone="green" size={32} />} /><Metric compact title="Série actuelle" value={t("{p0} jours", { p0: streak })} icon={<TileIcon name="flame" tone="red" size={32} />} /></View>
    <Card style={{ padding: 5, gap: 8 }}><Calendar initialMonth={month} onMonthChange={setMonth} selectedDate={selected} onSelectDate={date => { setSelected(date); onSessions(dateLabel(dayKey(date)), sessions.filter(item => item.date === dayKey(date))); }} renderDay={(date, isSelected) => { const rows = sessions.filter(entry => entry.date === dayKey(date)); const item = rows.find(row => row.status === 'completed') ?? rows.find(row => row.status === 'in_progress') ?? rows.find(row => row.status === 'abandoned') ?? rows.find(row => row.status === 'missed') ?? rows[0]; const missed = item?.status === 'missed' || item?.status === 'abandoned'; return <View style={{ width: '100%', height: '100%', backgroundColor: missed ? colors.energySurface : item?.sport === 'rest' ? colors.successSurface : item?.sport === 'boxing' ? colors.energySurface : item ? colors.primarySurface : colors.background, borderRadius: 9, borderWidth: isSelected ? 1.5 : 0, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 3 }}><Text style={s.label}>{date.getDate()}</Text>{item ? <Symbol name={missed ? 'warning' : item.sport === 'rest' ? 'check' : item.sport === 'strength' ? 'dumbbell' : 'flash'} color={missed || item.sport === 'boxing' ? 'energy' : item.sport === 'rest' ? 'success' : 'primary'} size={19} /> : <View style={{ height: 19 }} />}</View>; }} /><View style={[s.wrap, { justifyContent: 'center', paddingBottom: 12 }]}>{[['Muscu', colors.primary], ['Boxe', colors.energy], ['Repos prévu', colors.success], ['Manquée', colors.energy]].map(([title, color]) => <Text key={title} style={[s.small, { color }]}>{title === 'Manquée' ? '○' : '●'} {title}</Text>)}</View></Card>
    <Card style={s.card}><Text style={s.heading}>Cette semaine</Text><View style={[s.row, { justifyContent: 'space-between' }]}><IconButton size={30} accessibilityLabel={localizeLabel("Semaine précédente")} icon={<Symbol name="back" size={16} />} onPress={() => changeWeek(-7)} /><Text style={s.body}>{dateLabel(dayKey(week), true)} – {dateLabel(dayKey(end), true)}</Text><IconButton size={30} accessibilityLabel={localizeLabel("Semaine suivante")} icon={<Symbol name="chevron" size={16} />} onPress={() => changeWeek(7)} /></View>{sports.map(sport => { const entries = weekSessions.filter(item => item.sport === sport), done = entries.filter(item => item.status === 'completed').length; const title = sport === 'strength' ? 'Musculation' : sport === 'boxing' ? 'Boxe' : sport === 'rest' ? 'Repos planifié' : sport; return <Row key={sport} title={title} icon={<TileIcon name={sport === 'strength' ? 'dumbbell' : sport === 'boxing' ? 'boxing' : undefined} glyph="check" tone={sport === 'rest' ? 'green' : sport === 'boxing' ? 'red' : 'blue'} />} trailing={<Change text={`${done} / ${entries.length}`} tone={done < entries.length && sport !== 'rest' ? 'red' : 'green'} />} onPress={() => onSessions(title, entries)} />; })}</Card>
    <Button text="Voir les séances manquées ›" variant="outline" onPress={() => onSessions('Séances manquées', monthly.filter(item => item.status === 'missed'))} />
  </>;
}
