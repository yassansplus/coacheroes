import { useState } from 'react';
import { Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TrendChart } from '@/components/charts/TrendChart';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { members, type Member, type MemberId } from '../data';
import { Action, Avatar, Info, Panel, Row, s, TileIcon } from './UI';

export function Comparison({ member, onMember }: { member: Member; onMember: (id: MemberId) => void }) {
  const [weeks, setWeeks] = useState(4);
  const [sheet, setSheet] = useState<'period' | 'member' | null>(null);
  const me = members[0];
  const people = [me, member];
  const completed = (person: Member) => person.weekly.slice(-weeks).reduce((sum, value) => sum + value, 0);
  const planned = (person: Member) => weeks === 4 ? person.planned : Math.max(completed(person), Math.round(person.planned * weeks / 4));
  const metrics = [
    { label: 'Taux d’assiduité', icon: 'chart' as const, tone: 'purple' as const, value: (p: Member) => `${Math.round(completed(p) / planned(p) * 100)} %` },
    { label: 'Séances prévues', icon: 'calendar' as const, tone: 'green' as const, value: (p: Member) => String(planned(p)) },
    { label: 'Séances réalisées', icon: 'dumbbell' as const, tone: 'coral' as const, value: (p: Member) => String(completed(p)) },
    { label: 'Série actuelle', icon: 'flame' as const, tone: 'gold' as const, value: (p: Member) => `${p.streak} jours` },
    { label: 'Repos respectés', icon: 'check' as const, tone: 'purple' as const, value: () => '100 %' },
  ];
  return <>
    <Button text={weeks === 1 ? 'Dernière semaine' : `${weeks} dernières semaines`} variant="outline" radius="100%" leading={<TileIcon name="calendar" tone="green" size={29} />} trailing={<View style={{ transform: [{ rotate: '90deg' }] }}><Symbol name="chevron" size={17} /></View>} onPress={() => setSheet('period')} containerStyle={{ alignSelf: 'center' }} style={{ minHeight: 44, borderColor: colors.border }} textStyle={{ fontSize: 13 }} />
    <View style={[s.row, { gap: 8 }]}>{people.map(person => <Card key={person.id} style={[s.row, { flex: 1, padding: 13, gap: 9, borderRadius: 18 }]}><Avatar member={person} short size={52} /><View style={s.grow}><Text numberOfLines={1} adjustsFontSizeToFit style={s.title}>{person.name}</Text><Text style={[s.muted, { marginTop: 3 }]}>Niveau {person.level}</Text></View></Card>)}</View>
    <Panel><View style={[s.row, s.divider, { paddingBottom: 10, gap: 5 }]}><Text style={[s.muted, { flex: 1.8 }]}>Indicateurs</Text>{people.map(person => <Text key={person.id} style={[s.body, s.bold, { flex: 0.8, textAlign: 'center', fontSize: 12 }]}>{person.name}</Text>)}</View><View>{metrics.map((metric, index) => <Row key={metric.label} last={index === metrics.length - 1}><View style={[s.row, { flex: 1.8, gap: 6 }]}><TileIcon name={metric.icon} tone={metric.tone} size={30} /><Text style={[s.body, s.grow, { fontSize: 11 }]}>{metric.label}</Text></View>{people.map(person => <Text key={person.id} style={[s.body, s.bold, { flex: 0.8, textAlign: 'center', fontSize: 12 }]}>{metric.value(person)}</Text>)}</Row>)}</View></Panel>
    <Panel><View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }]}><Text style={s.title}>Séances réalisées</Text><View style={[s.row, { gap: 10 }]}>{people.map((person, index) => <View key={person.id} style={[s.row, { gap: 5 }]}><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: index ? colors.squadCoral : colors.squadPurple }} /><Text style={s.small}>{person.name}</Text></View>)}</View></View>
      <TrendChart groupedBars showLegend={false} showValues domain={[0, 6]} height={175} series={people.map((person, index) => ({ label: person.name, color: index ? colors.squadCoral : colors.squadPurple, kind: 'bar', points: person.weekly.slice(-weeks).map((value, i) => ({ label: `S${4 - weeks + i + 1}`, value })) }))} />
      <Info>Comparaison limitée à la régularité partagée.</Info>
    </Panel>
    <Action text="Changer d’ami" outline onPress={() => setSheet('member')} />
    <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'period' ? 'Période de comparaison' : 'Comparer avec un membre'}>
      {sheet === 'period' ? [1, 2, 4].map(value => <Row key={value} last={value === 4} onPress={() => { setWeeks(value); setSheet(null); }}><Text style={[s.body, s.grow]}>{value === 1 ? 'Dernière semaine' : `${value} dernières semaines`}</Text>{weeks === value ? <Symbol name="check" color="primary" /> : null}</Row>) : members.filter(person => person.id !== me.id).map(person => <Row key={person.id} onPress={() => { onMember(person.id); setSheet(null); }}><Avatar member={person} /><Text style={[s.body, s.grow]}>{person.name}</Text>{person.id === member.id ? <Symbol name="check" color="primary" /> : null}</Row>)}
    </BottomSheet>
  </>;
}
