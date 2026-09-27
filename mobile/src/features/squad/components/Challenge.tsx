import { Text, View, useWindowDimensions } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { useMetricMotion } from '@/hooks/useMetricMotion';
import type { SquadGroupDetail } from '@/services/squad';
import { dayLabel } from '../data';
import { Action, Avatar, Emblem, Heading, Panel, Row, s, TileIcon } from './UI';

export function Challenge({ detail, userId, onProgram, onMember, onCreate, onHistory }: {
  detail: SquadGroupDetail; userId: string; onProgram: () => void; onMember: (id: string) => void; onCreate: () => void; onHistory: () => void;
}) {
  const { width } = useWindowDimensions();
  const challenge = detail.activeChallenge;
  const [count] = useMetricMotion([challenge?.currentSessions ?? 0], { haptic: 'rain' });
  if (!challenge) return <><Panel><EmptyState title="Pas de challenge en cours" description="Le créateur du groupe peut lancer un objectif commun de 7 ou 14 jours." /></Panel>
    {detail.group.ownerId === userId ? <Action text="Lancer un challenge" onPress={onCreate} /> : null}
    {detail.challengeHistory.length ? <Action text="Historique des challenges" outline onPress={onHistory} /> : null}</>;
  const contributions = detail.members.map(member => ({ member, count: challenge.contributions.find(item => item.userId === member.id)?.count ?? 0 }));
  return <>
    <Panel><View style={s.row}><Emblem gold size={Math.min(76, width * 0.17)} /><View style={s.grow}><Text numberOfLines={1} adjustsFontSizeToFit style={s.title}>{challenge.title}</Text><View style={[s.row, { gap: 6, marginTop: 4 }]}><Text numberOfLines={1} adjustsFontSizeToFit style={[s.muted, s.grow]}>{dayLabel(challenge.startsAt)} – {dayLabel(challenge.endsAt)}</Text><Text style={[s.small, { color: colors.primary, backgroundColor: colors.primarySurface, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5 }]}>En cours</Text></View></View></View>
      <View style={[s.row, { borderTopWidth: 0.5, borderColor: colors.border, paddingTop: 8 }]}><View style={s.grow}><ProgressRing progress={Math.min(100, count / challenge.targetSessions * 100)} size={Math.min(158, width * 0.34)} strokeWidth={11}><Text style={[s.number, { fontSize: 32 }]}>{Math.round(count)}</Text><Text style={[s.muted, s.bold]}>/ {challenge.targetSessions}</Text><Text style={s.muted}>séances</Text></ProgressRing></View><View style={[s.row, { flex: 1, borderLeftWidth: 0.5, borderColor: colors.border, paddingLeft: 20, minHeight: 72, gap: 6 }]}><Text style={[s.number, { fontSize: 32 }]}>{Math.max(0, challenge.targetSessions - challenge.currentSessions)}</Text><Text style={s.muted}>restantes</Text></View></View></Panel>
    <Heading>Contributions</Heading><Panel><View>{contributions.map(({ member, count: amount }, index) => <Row key={member.id} last={index === contributions.length - 1} onPress={() => onMember(member.id)}><Avatar member={member} short /><Text style={[s.body, s.bold, { width: 70 }]} numberOfLines={1}>{member.name}</Text><View style={s.grow}><Text style={[s.muted, { marginBottom: 4 }]}>{amount} séance{amount > 1 ? 's' : ''}</Text><ProgressBar progress={challenge.targetSessions ? amount / challenge.targetSessions * 100 : 0} height={7} /></View><Text style={s.muted}>{amount}</Text></Row>)}</View></Panel>
    <Heading>Règles</Heading><Panel><View>{[
      { icon: 'dumbbell' as const, tone: 'purple' as const, text: 'Une séance terminée compte, quel que soit le sport.' },
      { icon: 'clock' as const, tone: 'green' as const, text: `Durée minimum : ${challenge.minMinutes} min.` },
      { icon: 'calendar' as const, tone: 'coral' as const, text: 'Maximum une contribution par personne et par jour.' },
    ].map((rule, index) => <Row key={rule.text} last={index === 2}><TileIcon name={rule.icon} tone={rule.tone} size={34} /><Text style={[s.body, s.grow, { fontSize: 12 }]}>{rule.text}</Text><Symbol name="chevron" color="textSecondary" size={16} /></Row>)}</View></Panel>
    <Panel><View style={s.row}><TileIcon name="calendar" tone="blue" size={34} /><Text style={[s.body, s.grow]}>Fin le {new Date(challenge.endsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</Text></View></Panel>
    <View style={s.stack}><Action text="Voir mes séances prévues" onPress={onProgram} />{detail.challengeHistory.length ? <Action text="Historique des challenges" outline onPress={onHistory} /> : null}</View>
  </>;
}
