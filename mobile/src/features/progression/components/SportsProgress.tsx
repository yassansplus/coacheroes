import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Calendar } from '@/components/Calendar';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TrendChart } from '@/components/charts/TrendChart';
import { colors } from '@/theme/colors';
import { dateLabel, dayKey, daysBetween, exercises, number, referenceDate, withinDays } from '../data';
import type { BoxingTest, Session } from '../types';
import { Change, Metric, Row, TileIcon } from './UI';
import { s } from './styles';

export function StrengthProgress({ exerciseId, onExercise, onHistory }: { exerciseId: string; onExercise: () => void; onHistory: (title: string, lines: string[]) => void }) {
  const [metric, setMetric] = useState('max');
  const [period, setPeriod] = useState('4');
  const exercise = exercises.find(item => item.id === exerciseId) ?? exercises[0];
  const values = metric === 'max' ? exercise.maxes : metric === 'load' ? exercise.loads : exercise.volumes;
  const unit = metric === 'volume' && exercise.unit === 'kg' ? 'kg' : exercise.unit;
  const title = metric === 'max' ? exercise.id === 'pullups' ? 'Répétitions maximales' : '1RM estimé' : metric === 'load' ? 'Charge' : 'Volume';
  const history = exercise.loads.map((value, i) => `${['15 juin', '15 juillet', '15 août', '15 septembre'][i]} · ${number(value)} ${exercise.unit} · ${exercise.id === 'pullups' ? '3 séries' : '8 / 8 / 7 répétitions'}`);
  return <><Card style={s.card}><Row title={exercise.title} icon={<TileIcon name="dumbbell" size={50} />} onPress={onExercise} /></Card><TabSelector value={metric} onChange={setMetric} items={[{ value: 'max', label: exercise.id === 'pullups' ? 'Répétitions' : '1RM estimé' }, { value: 'load', label: exercise.id === 'pullups' ? 'Meilleure série' : 'Charge' }, { value: 'volume', label: 'Volume' }]} />
    <View style={[s.row, { alignItems: 'stretch', gap: 8 }]}><Metric compact title={exercise.id === 'pullups' ? 'Maximum' : '1RM estimé'} value={`${number(exercise.maxes[3])} ${exercise.unit}`} icon={<TileIcon glyph="chart" size={32} />} change={`↑ +${number(exercise.maxes[3] - exercise.maxes[0])}`} /><Metric compact title="Meilleure série" value={`${number(exercise.loads[3])}${exercise.id === 'pullups' ? ' rép.' : ' kg × 8'}`} icon={<TileIcon name="trophy" tone="purple" size={32} />} /><Metric compact title="Volume mensuel" value={`${number(exercise.volumes[3])} ${unit}`} icon={<TileIcon glyph="layers" tone="green" size={32} />} change={`↑ +${Math.round((exercise.volumes[3] / exercise.volumes[2] - 1) * 100)} %`} /></View>
    <Card style={s.card}><Text style={s.heading}>{title}</Text><TabSelector value={period} onChange={setPeriod} items={[{ value: '2', label: '2 mois' }, { value: '4', label: '4 mois' }]} /><TrendChart key={`${exerciseId}-${metric}-${period}`} unit={unit} showValues height={200} series={[{ label: title, color: colors.primary, gradient: true, points: values.map((value, index) => ({ label: ['Juin', 'Juillet', 'Août', 'Sept.'][index], value })).slice(-Number(period)) }]} /></Card>
    <Card style={s.card}><View style={s.row}><Text style={[s.heading, s.grow]}>Dernières performances</Text><Pressable accessibilityRole="button" onPress={() => onHistory(exercise.title, history)}><Text style={[s.small, { color: colors.primary }]}>Voir toutes ›</Text></Pressable></View>{history.slice(-3).reverse().map(line => <Row key={line} title={line.split(' · ')[1]} subtitle={line.split(' · ')[2]} icon={<Text style={s.body}>{line.split(' · ')[0]}</Text>} onPress={() => onHistory(exercise.title, [line])} />)}</Card>
    <Button text="Changer d’exercice" variant="outline" onPress={onExercise} />
  </>;
}
export const testValue = (test: BoxingTest) => test.kind === 'Corde' ? `${Math.floor(test.value / 60)}:${String(test.value % 60).padStart(2, '0')}` : String(test.value);
export function BoxingProgress({ sessions, tests, onAdd, onSessions, onHistory }: { sessions: Session[]; tests: BoxingTest[]; onAdd: () => void; onSessions: () => void; onHistory: (title: string, lines: string[]) => void }) {
  const [period, setPeriod] = useState('28');
  const visible = withinDays(sessions, Number(period), referenceDate).filter(item => item.sport === 'boxing');
  const completed = visible.filter(item => !item.missed);
  const minutes = completed.reduce((sum, item) => sum + item.minutes, 0);
  const rounds = Array.from({ length: Number(period) / 7 }, (_, index) => ({ label: `S${index + 1}`, value: visible.filter(item => Math.floor(daysBetween(item.date, referenceDate) / 7) === Number(period) / 7 - index - 1).reduce((sum, item) => sum + item.rounds, 0) }));
  return <><TabSelector value={period} onChange={setPeriod} items={[{ value: '28', label: '4 dernières semaines' }, { value: '56', label: '8 semaines' }]} /><View style={s.row}><Metric title="Séances" value={String(completed.length)} icon={<TileIcon name="calendar" />} /><Metric title="Rounds" value={String(completed.reduce((sum, item) => sum + item.rounds, 0))} icon={<TileIcon name="boxing" tone="purple" />} /></View><View style={s.row}><Metric title="Temps total" value={`${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`} icon={<TileIcon glyph="clock" />} /><Metric title="Assiduité" value={`${Math.round(completed.length / Math.max(1, visible.length) * 100)} %`} icon={<TileIcon glyph="check" tone="green" />} /></View>
    <Card style={s.card}><Text style={s.heading}>Rounds par semaine</Text><TrendChart key={period} height={175} showValues series={[{ label: 'Rounds', color: colors.primary, gradient: true, kind: 'bar', points: rounds }]} /></Card>
    <Card style={s.card}><Text style={s.heading}>Tests suivis</Text>{(['Sac', 'Corde', 'Sparring'] as const).map(kind => { const entries = tests.filter(item => item.kind === kind); const first = entries[0], last = entries[entries.length - 1]; return <Row key={kind} title={kind} subtitle={kind === 'Sac' ? 'frappes en 3 min' : kind === 'Corde' ? 'sans interruption' : 'rounds enregistrés'} icon={<TileIcon name={kind === 'Sac' ? 'punchingBag' : kind === 'Sparring' ? 'boxing' : undefined} glyph="clock" tone={kind === 'Sac' ? 'red' : 'purple'} />} trailing={<Change text={last ? `${first !== last ? `${testValue(first)} → ` : ''}${testValue(last)}` : '—'} tone="blue" />} onPress={() => onHistory(kind, entries.map(item => `${dateLabel(item.date)} · ${testValue(item)} ${kind === 'Sac' ? 'frappes' : kind === 'Sparring' ? 'rounds' : ''}`))} />; })}</Card>
    <View style={s.actions}><Button text="＋ Ajouter un test" onPress={onAdd} /><Button text="Voir les séances" variant="secondary" textColor={colors.primary} onPress={onSessions} /></View>
  </>;
}
export function Attendance({ sessions, onSessions }: { sessions: Session[]; onSessions: (title: string, entries: Session[]) => void }) {
  const [month, setMonth] = useState(new Date(2026, 8, 1));
  const [selected, setSelected] = useState(new Date(2026, 8, 15));
  const [week, setWeek] = useState(new Date(2026, 8, 7));
  const monthly = sessions.filter(item => item.date.startsWith(dayKey(month).slice(0, 7)));
  const planned = monthly.filter(item => item.sport !== 'rest');
  const complete = planned.filter(item => !item.missed);
  const end = new Date(week); end.setDate(end.getDate() + 6);
  const weekSessions = sessions.filter(item => item.date >= dayKey(week) && item.date <= dayKey(end));
  let streak = 0;
  for (const item of sessions.slice().reverse()) { if (item.missed) break; streak++; }
  function changeWeek(delta: number) { setWeek(value => new Date(value.getFullYear(), value.getMonth(), value.getDate() + delta)); }
  return <><View style={[s.row, { alignItems: 'stretch', gap: 8 }]}><Metric compact title={month.toLocaleDateString('fr-FR', { month: 'long' })} value={`${complete.length} / ${planned.length}`} icon={<TileIcon glyph="calendar" size={32} />} /><Metric compact title="Taux" value={planned.length ? `${Math.round(complete.length / planned.length * 100)} %` : '—'} icon={<TileIcon glyph="chart" tone="green" size={32} />} /><Metric compact title="Série actuelle" value={`${streak} jours`} icon={<TileIcon name="flame" tone="red" size={32} />} /></View>
    <Card style={{ padding: 5, gap: 8 }}><Calendar initialMonth={month} onMonthChange={setMonth} selectedDate={selected} onSelectDate={date => { setSelected(date); onSessions(dateLabel(dayKey(date)), sessions.filter(item => item.date === dayKey(date))); }} renderDay={(date, isSelected) => { const item = sessions.find(entry => entry.date === dayKey(date)); return <View style={{ width: '100%', height: '100%', backgroundColor: item?.missed ? colors.energySurface : item?.sport === 'rest' ? colors.successSurface : item?.sport === 'boxing' ? colors.energySurface : item ? colors.primarySurface : colors.background, borderRadius: 9, borderWidth: isSelected ? 1.5 : 0, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 3 }}><Text style={s.label}>{date.getDate()}</Text>{item ? <Symbol name={item.missed ? 'warning' : item.sport === 'rest' ? 'check' : item.sport === 'strength' ? 'dumbbell' : 'flash'} color={item.missed || item.sport === 'boxing' ? 'energy' : item.sport === 'rest' ? 'success' : 'primary'} size={19} /> : <View style={{ height: 19 }} />}</View>; }} /><View style={[s.wrap, { justifyContent: 'center', paddingBottom: 12 }]}>{[['Muscu', colors.primary], ['Boxe', colors.energy], ['Repos prévu', colors.success], ['Manquée', colors.energy]].map(([title, color]) => <Text key={title} style={[s.small, { color }]}>{title === 'Manquée' ? '○' : '●'} {title}</Text>)}</View></Card>
    <Card style={s.card}><Text style={s.heading}>Cette semaine</Text><View style={[s.row, { justifyContent: 'space-between' }]}><IconButton size={30} accessibilityLabel="Semaine précédente" icon={<Symbol name="back" size={16} />} onPress={() => changeWeek(-7)} /><Text style={s.body}>{dateLabel(dayKey(week), true)} – {dateLabel(dayKey(end), true)}</Text><IconButton size={30} accessibilityLabel="Semaine suivante" icon={<Symbol name="chevron" size={16} />} onPress={() => changeWeek(7)} /></View>{(['strength', 'boxing', 'rest'] as const).map(sport => { const entries = weekSessions.filter(item => item.sport === sport), done = entries.filter(item => !item.missed).length; const title = sport === 'strength' ? 'Musculation' : sport === 'boxing' ? 'Boxe' : 'Repos planifié'; return <Row key={sport} title={title} icon={<TileIcon name={sport === 'strength' ? 'dumbbell' : sport === 'boxing' ? 'boxing' : undefined} glyph="check" tone={sport === 'rest' ? 'green' : sport === 'boxing' ? 'red' : 'blue'} />} trailing={<Change text={`${done} / ${entries.length}`} tone={done < entries.length ? 'red' : 'green'} />} onPress={() => onSessions(title, entries)} />; })}</Card>
    <Button text="Voir les séances manquées ›" variant="outline" onPress={() => onSessions('Séances manquées', monthly.filter(item => item.missed))} />
  </>;
}
