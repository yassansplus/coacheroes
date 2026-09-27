import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import type { SquadGroupDetail, SquadOverview } from '@/services/squad';
import { dayLabel, sportLabel, type Page } from '../data';
import { Action, Avatar, Emblem, Heading, Panel, Row, s, TileIcon } from './UI';

export function SquadHome({ overview, detail, open, onGroups, onInviteFriend, onInviteGroup, onCreateGroup }: {
  overview: SquadOverview; detail: SquadGroupDetail | null; open: (page: Page) => void;
  onGroups: () => void; onInviteFriend: () => void; onInviteGroup: () => void; onCreateGroup: () => void;
}) {
  const group = detail?.group, members = detail?.members ?? [], challenge = detail?.activeChallenge;
  const ranking = members.slice().sort((a, b) => b.stats.sessionsWeek - a.stats.sessionsWeek);
  const activities = detail?.activity ?? overview.activity;
  const people = new Map([overview.self, ...overview.friends, ...members].map(person => [person.id, person]));
  return <>
    {group ? <Panel><View style={s.row}><Emblem /><View style={s.grow}><Text style={s.title}>{group.name}</Text><Text style={[s.muted, { marginTop: 3 }]}>{group.memberCount} membres · Groupe privé</Text><View style={[s.row, { gap: 5, marginTop: 10 }]}>{members.slice(0, 6).map(member => <Avatar key={member.id} member={member} short size={28} />)}</View></View><Button text="Changer" variant="outline" radius={16} onPress={onGroups} style={{ paddingHorizontal: 12, minHeight: 32 }} textStyle={{ fontSize: 11 }} /></View></Panel>
      : <Panel><EmptyState title="Ton groupe commence ici" description="Crée un groupe ou rejoins celui de tes amis avec un code d’invitation." /><View style={s.row}><View style={s.grow}><Action text="Créer un groupe" onPress={onCreateGroup} /></View><View style={s.grow}><Action text="Rejoindre" outline onPress={() => open({ kind: 'settings' })} /></View></View></Panel>}
    {group ? <><Panel><View style={[s.row, { gap: 8 }]}>{[
      { label: 'Membres', value: String(group.memberCount), icon: 'users' as const, tone: 'purple' as const },
      { label: 'Séances semaine', value: String(group.sessionsWeek ?? 0), icon: 'calendar' as const, tone: 'green' as const },
      { label: 'Assiduité', value: group.attendance === null ? '—' : `${group.attendance} %`, icon: 'target' as const, tone: 'coral' as const },
    ].map((metric, index) => <View key={metric.label} style={[s.row, { flex: 1, gap: 6, borderLeftWidth: index ? 0.5 : 0, borderColor: colors.border, paddingLeft: index ? 8 : 0 }]}><TileIcon name={metric.icon} tone={metric.tone} size={31} /><View style={s.grow}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.small, { fontSize: 9 }]}>{metric.label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.number, { fontSize: 18, marginTop: 4 }]}>{metric.value}</Text></View></View>)}</View></Panel>
      <Panel><View style={s.row}><Emblem gold trophy size={54} /><View style={s.grow}><View style={[s.row, { justifyContent: 'space-between', gap: 4 }]}><Text style={s.body}>Challenge collectif</Text><Text style={s.small}>{challenge ? `Fin ${dayLabel(challenge.endsAt)}` : 'À lancer'}</Text></View><Text style={[s.title, { marginVertical: 5 }]}>{challenge?.title ?? 'Un objectif à relever ensemble'}</Text><View style={s.row}><ProgressBar progress={challenge ? Math.min(100, challenge.currentSessions / challenge.targetSessions * 100) : 0} height={13} style={s.grow} /><Text style={[s.body, s.bold]}>{challenge ? `${challenge.currentSessions} / ${challenge.targetSessions}` : '—'}</Text></View></View></View><Action text={challenge ? 'Voir le challenge' : 'Voir les challenges'} onPress={() => open({ kind: 'challenge' })} /></Panel>
      <Heading action="Tout voir" onPress={() => open({ kind: 'ranking' })}>Classement</Heading><Panel><View>{ranking.length ? ranking.slice(0, 4).map((member, index) => <Row key={member.id} last={index === Math.min(ranking.length, 4) - 1} onPress={() => open({ kind: 'member', member: member.id })}><Text style={[s.body, { width: 14 }]}>{index + 1}</Text><Avatar member={member} short size={29} /><Text style={[s.body, s.grow]}>{member.name}</Text><Text style={s.body}>{member.stats.sessionsWeek} séances</Text><Symbol name="chevron" size={16} color="textMuted" /></Row>) : <Text style={s.muted}>Les séances terminées apparaîtront ici.</Text>}</View></Panel>
    </> : null}
    <Heading action="Tout voir" onPress={() => open({ kind: 'friends' })}>Mes amis</Heading>
    <Panel>{overview.friends.length ? overview.friends.slice(0, 4).map((friend, index) => <Row key={friend.id} last={index === Math.min(overview.friends.length, 4) - 1} onPress={() => open({ kind: 'member', member: friend.id })}><Avatar member={friend} short size={33} /><Text style={[s.body, s.grow]}>{friend.name}</Text><Text style={s.muted}>{friend.stats.sessionsWeek} séances cette semaine</Text><Symbol name="chevron" size={16} color="textMuted" /></Row>) : <Text style={s.muted}>Invite un ami pour suivre vos entraînements ensemble.</Text>}<Action text="Inviter un ami" outline onPress={onInviteFriend} /></Panel>
    <Heading action="Tout voir" onPress={() => open({ kind: 'activity' })}>Activité récente</Heading>
    <Panel><View>{activities.length ? activities.slice(0, 2).map((event, index) => <Row key={event.id} last={index === Math.min(activities.length, 2) - 1} onPress={() => open({ kind: 'member', member: event.userId })}><TileIcon name={event.sport === 'boxing' ? 'boxing' : 'dumbbell'} /><View style={s.grow}><Text style={s.muted}><Text style={s.bold}>{people.get(event.userId)?.name ?? 'Membre'}</Text> a terminé une séance{event.sport !== 'session' ? ` de ${sportLabel(event.sport).toLowerCase()}` : ''}</Text><Text style={[s.small, { marginTop: 4 }]}>{dayLabel(event.at)}</Text></View><Symbol name="chevron" size={16} color="textMuted" /></Row>) : <Text style={s.muted}>Pas encore d’activité partagée.</Text>}</View></Panel>
    {group ? <View style={s.stack}><Action text="Inviter au groupe" onPress={onInviteGroup} /><Action text="Gérer le groupe" outline onPress={() => open({ kind: 'manage' })} /></View> : null}
  </>;
}
