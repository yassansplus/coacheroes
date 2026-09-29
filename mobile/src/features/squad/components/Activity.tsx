import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { Fragment } from 'react';
import { View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import type { SquadActivity, SquadPerson } from '@/services/squad';
import { sportLabel, timeLabel } from '../data';
import { Action, Avatar, Heading, Panel, Row, s, TileIcon } from './UI';

export function Activity({ activities, people, member, filter, onFilter, onMember, onPrivacy }: {
  activities: SquadActivity[]; people: SquadPerson[]; member?: string; filter: string;
  onFilter: (value: string) => void; onMember: (id: string) => void; onPrivacy: () => void;
}) {
  useLanguage();
  const visible = activities.filter(activity => (!member || activity.userId === member) && (filter === 'all' || filter === activity.sport));
  const byId = new Map(people.map(person => [person.id, person]));
  const days = [...new Set(visible.map(activity => new Date(activity.at).toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' })))];
  return <>
    <TabSelector value={filter} onChange={onFilter} items={[{ value: 'all', label: 'Tout' }, { value: 'strength', label: 'Muscu' }, { value: 'boxing', label: 'Boxe' }]} />
    {member ? <Text style={s.muted}>Activité partagée de {byId.get(member)?.name ?? 'cet ami'}</Text> : null}
    {days.map(day => {
      const entries = visible.filter(activity => new Date(activity.at).toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' }) === day);
      return <Fragment key={day}><Heading>{day}</Heading><Panel><View>{entries.map((entry, index) => {
        const person = byId.get(entry.userId);
        return <Row key={entry.id} last={index === entries.length - 1} onPress={person ? () => onMember(person.id) : undefined}>{person ? <Avatar member={person} size={40} /> : null}<TileIcon name={entry.sport === 'boxing' ? 'boxing' : 'dumbbell'} tone="purple" size={44} /><View style={[s.grow, { paddingVertical: 6, gap: 3 }]}><Text style={[s.title, { fontSize: 14 }]}>{person?.name ?? 'Membre'}</Text><Text style={s.muted}>{entry.sport === 'session' ? 'Séance terminée' : t("{p0} terminé{p1}", { p0: sportLabel(entry.sport), p1: entry.sport === 'strength' ? 'e' : '' })}</Text>{entry.minutes ? <Text style={s.muted}>{entry.minutes} min</Text> : null}</View><Text style={s.small}>{timeLabel(entry.at)}</Text><Symbol name="chevron" size={16} color="textMuted" /></Row>;
      })}</View></Panel></Fragment>;
    })}
    {!visible.length ? <Panel><EmptyState title="Aucune activité partagée" description="Aucune activité ne correspond à ce filtre pour le moment." /></Panel> : null}
    <View style={{ marginTop: 20 }}><Action text="Paramètres de confidentialité" outline onPress={onPrivacy} /></View>
  </>;
}
