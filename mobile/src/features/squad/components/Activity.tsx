import { Fragment } from 'react';
import { Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { colors } from '@/theme/colors';
import { activities, memberById, type MemberId } from '../data';
import { Action, Avatar, Heading, Panel, Row, s, TileIcon } from './UI';

export function Activity({ member, filter, onFilter, onChallenge }: { member?: MemberId; filter: string; onFilter: (value: string) => void; onChallenge: () => void }) {
  const visible = activities.filter(activity => (!member || activity.member === member) && (filter === 'all' || filter === activity.category));
  return <>
    <TabSelector value={filter} onChange={onFilter} items={[{ value: 'all', label: 'Tout' }, { value: 'sessions', label: 'Séances' }, { value: 'records', label: 'Records' }, { value: 'missions', label: 'Missions' }]} />
    {member ? <Text style={s.muted}>Activité partagée de {memberById(member).name}</Text> : null}
    {['Aujourd’hui', 'Hier'].map(day => {
      const entries = visible.filter(activity => activity.day === day);
      return entries.length ? <Fragment key={day}><Heading>{day}</Heading><Panel><View>{entries.map((entry, index) => <Row key={entry.id} last={index === entries.length - 1} onPress={entry.id === 'challenge' ? onChallenge : undefined}><Avatar member={memberById(entry.member)} size={40} /><TileIcon name={entry.icon} tone={entry.tone} size={44} /><View style={[s.grow, { paddingVertical: 6, gap: 3 }]}><Text style={[s.title, { fontSize: 14 }]}>{memberById(entry.member).name}</Text><Text style={s.muted}>{entry.title}</Text><View style={[s.row, { flexWrap: 'wrap', gap: 4 }]}><Text style={s.muted}>{entry.detail}</Text>{'xp' in entry ? <Text style={[s.small, { backgroundColor: colors.successSurface, color: colors.successText, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 }]}>+{entry.xp} XP</Text> : null}</View></View><Text style={s.small}>{entry.time}</Text><Symbol name="chevron" color="textMuted" size={16} /></Row>)}</View></Panel></Fragment> : null;
    })}
    {!visible.length ? <Panel><EmptyState title="Aucune activité partagée" description="Aucune activité ne correspond à ce filtre pour le moment." /></Panel> : null}
    <View style={{ marginTop: 20 }}><Action text="Paramètres de confidentialité" outline /></View>
  </>;
}
