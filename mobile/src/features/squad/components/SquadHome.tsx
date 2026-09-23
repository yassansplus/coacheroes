import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { members, groupXP, groupSessions, type Page } from '../data';
import { Action, Avatar, Emblem, Heading, Panel, Row, s, TileIcon } from './UI';

export function SquadHome({ open }: { open: (page: Page) => void }) {
  return <>
    <Panel><View style={s.row}><Emblem /><View style={s.grow}><Text style={s.title}>September Grind</Text><Text style={[s.muted, { marginTop: 3 }]}>4 membres · Groupe privé</Text><View style={[s.row, { gap: 5, marginTop: 10 }]}>{members.map(member => <Avatar key={member.id} member={member} short size={28} />)}</View></View><Button text="Inviter" variant="outline" radius={16} disabled onPress={() => {}} style={{ paddingHorizontal: 12, minHeight: 32 }} textStyle={{ fontSize: 11 }} /></View></Panel>
    <Panel><View style={[s.row, { gap: 8 }]}>{[
      { label: 'XP cette semaine', value: groupXP.toLocaleString('fr-FR'), icon: 'chart' as const, tone: 'purple' as const },
      { label: 'Séances', value: String(groupSessions), icon: 'calendar' as const, tone: 'green' as const },
      { label: 'Assiduité', value: '91 %', icon: 'target' as const, tone: 'coral' as const },
    ].map((metric, index) => <View key={metric.label} style={[s.row, { flex: 1, gap: 6, borderLeftWidth: index ? 0.5 : 0, borderColor: colors.border, paddingLeft: index ? 8 : 0 }]}><TileIcon name={metric.icon} tone={metric.tone} size={31} /><View style={s.grow}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.small, { fontSize: 9 }]}>{metric.label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.number, { fontSize: 18, marginTop: 4 }]}>{metric.value}</Text></View></View>)}</View></Panel>
    <Panel><View style={s.row}><Emblem gold trophy size={54} /><View style={s.grow}><View style={[s.row, { justifyContent: 'space-between', gap: 4 }]}><Text style={s.body}>Challenge collectif</Text><Text style={s.small}>Fin dimanche</Text></View><Text style={[s.title, { marginVertical: 5 }]}>20 entraînements</Text><View style={s.row}><ProgressBar progress={70} height={13} style={s.grow} /><Text style={[s.body, s.bold]}>14 / 20</Text></View></View></View><Action text="Voir le challenge" onPress={() => open({ kind: 'challenge' })} /></Panel>
    <Heading action="Tout voir" onPress={() => open({ kind: 'ranking' })}>Classement</Heading>
    <Panel><View>{members.map((member, index) => <Row key={member.id} last={index === members.length - 1} onPress={() => open({ kind: 'member', member: member.id })}><Text style={[s.body, { width: 14 }]}>{index + 1}</Text><Avatar member={member} short size={29} /><Text style={[s.body, s.grow]}>{member.name}</Text><Text style={s.body}>{member.xp.toLocaleString('fr-FR')} XP</Text><Symbol name="chevron" size={16} color="textMuted" /></Row>)}</View></Panel>
    <Heading action="Tout voir" onPress={() => open({ kind: 'activity' })}>Activité récente</Heading>
    <Panel><View><Row onPress={() => open({ kind: 'activity', member: 'yassine' })}><TileIcon name="dumbbell" /><View style={s.grow}><Text style={s.muted}><Text style={s.bold}>Yassine</Text> a complété une séance</Text><Text style={[s.small, { marginTop: 4 }]}>Il y a 2 h</Text></View><Symbol name="chevron" size={16} color="textMuted" /></Row><Row last onPress={() => open({ kind: 'activity', member: 'karim' })}><TileIcon name="clipboard" tone="green" /><View style={s.grow}><Text style={s.muted}><Text style={s.bold}>Karim</Text> a atteint son objectif du jour</Text><Text style={[s.small, { marginTop: 4 }]}>Il y a 5 h</Text></View><Symbol name="chevron" size={16} color="textMuted" /></Row></View></Panel>
    <Action text="Gérer le groupe" outline />
  </>;
}
