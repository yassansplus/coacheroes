import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TabSelector } from '@/components/TabSelector';
import { TrendChart } from '@/components/charts/TrendChart';
import { colors } from '@/theme/colors';
import { dateLabel, daysBetween, measureLabels, movingAverage, number, withinDays } from '../data';
import type { Measurement, MeasureKey, WeightEntry } from '../types';
import { Change, Metric, Row, TileIcon } from './UI';
import { s } from './styles';

export function WeightProgress({ entries, onAdd, onHistory }: { entries: WeightEntry[]; onAdd: () => void; onHistory: () => void }) {
  const [period, setPeriod] = useState('30');
  const last = entries[entries.length - 1];
  const visible = withinDays(entries, Number(period), last.date);
  const averages = movingAverage(entries);
  const average = averages[averages.length - 1].value;
  const previous = averages.filter(item => daysBetween(item.date, last.date) >= 7).slice(-1)[0]?.value ?? average;
  const count = withinDays(entries, 7, last.date).length;
  return <><TabSelector value={period} onChange={setPeriod} items={[['30', '1 mois'], ['90', '3 mois'], ['180', '6 mois'], ['365', '1 an']].map(([value, label]) => ({ value, label }))} />
    <View style={[s.row, { alignItems: 'stretch', gap: 7 }]}>
      {[
        { title: 'Actuel', label: 'Actuel', value: last.value },
        { title: 'Moyenne 7 jours', label: 'Moy. 7 j', value: average },
        { title: 'Semaine précédente', label: 'Sem. préc.', value: previous },
        { title: 'Variation', label: 'Variation', value: average - previous },
      ].map((item, index) => (
        <Metric
          key={item.title}
          compact
          compactValueSize={19}
          compactLabelSize={11}
          compactTitle={item.label}
          title={item.title}
          value={`${number(item.value)} kg`}
          icon={index === 0 ? <TileIcon name="scale" size={28} /> : <TileIcon glyph="chart" tone={index === 3 ? 'green' : 'purple'} size={28} />}
        />
      ))}
    </View>
    <Card style={s.card}><Text style={s.heading}>Évolution</Text><TrendChart unit="kg" height={275} series={[{ label: 'Poids quotidien', kind: 'dots', color: colors.textMuted, points: visible.map(item => ({ label: dateLabel(item.date, true), value: item.value })) }, { label: 'Moyenne 7 jours', color: colors.primary, gradient: true, points: withinDays(averages, Number(period), last.date).map(item => ({ label: dateLabel(item.date, true), value: item.value })) }]} /></Card>
    <Card style={s.card}><View style={[s.row, { flexWrap: 'wrap' }]}><TileIcon glyph="calendar" /><View style={s.grow}><Text style={s.body}>Pesées cette semaine</Text><Text style={s.value}>{count} / 7</Text></View><View style={[s.row, { gap: 4 }]}>{Array.from({ length: 7 }, (_, i) => <View key={i} style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: i < count ? colors.primary : colors.surface }} />)}</View></View></Card>
    <View style={s.actions}><Button text="＋ Ajouter une pesée" hapticFeedback onPress={onAdd} /><Button text="Voir les données" variant="outline" onPress={onHistory} /></View>
  </>;
}
export function MeasurementsProgress({ entries, onAdd, onHistory }: { entries: Measurement[]; onAdd: () => void; onHistory: () => void }) {
  const [selected, setSelected] = useState<MeasureKey>('waist');
  const [period, setPeriod] = useState('120');
  const latest = entries[entries.length - 1];
  return <><Card style={s.card}><Row title="Dernière mesure" value={dateLabel(latest.date)} icon={<TileIcon glyph="calendar" />} onPress={onHistory} /></Card>
    {(Object.keys(measureLabels) as MeasureKey[]).map(key => <Card key={key} style={{ padding: 10 }}><Row title={measureLabels[key]} value={`${number(latest[key])} cm`} icon={<TileIcon glyph={key === 'waist' ? 'waist' : key === 'chest' ? 'chest' : key === 'arm' ? 'arm' : 'thigh'} size={50} />} trailing={<Change text={`${latest[key] - entries[0][key] > 0 ? '+' : ''}${number(latest[key] - entries[0][key])} cm`} />} onPress={() => setSelected(key)} /></Card>)}
    <Card style={s.card}><Text style={s.heading}>{measureLabels[selected]}</Text><TabSelector value={period} onChange={setPeriod} items={[{ value: '120', label: '4 mois' }, { value: '180', label: '6 mois' }, { value: '365', label: '1 an' }]} /><TrendChart key={selected + period} showValues unit="cm" height={185} series={[{ label: measureLabels[selected], color: colors.primary, gradient: true, points: withinDays(entries, Number(period), latest.date).map(item => ({ label: new Date(`${item.date}T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' }), value: item[selected], detail: dateLabel(item.date) })) }]} /></Card>
    <View style={s.actions}><Button text="＋ Ajouter des mesures" hapticFeedback onPress={onAdd} /><Button text="Historique" variant="secondary" backgroundColor={colors.primarySurface} onPress={onHistory} /></View>
  </>;
}
