import { Text, View, useWindowDimensions } from 'react-native';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { useMetricMotion } from '@/hooks/useMetricMotion';
import { members, type MemberId } from '../data';
import { Action, Avatar, Emblem, Heading, Panel, Row, s, TileIcon } from './UI';

export function Challenge({ onProgram, onMember }: { onProgram: () => void; onMember: (id: MemberId) => void }) {
  const { width } = useWindowDimensions();
  const [count] = useMetricMotion([14], { haptic: 'rain' });
  return <>
    <Panel><View style={s.row}>
      <Emblem gold size={Math.min(76, width * 0.17)} />
      <View style={s.grow}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={s.title}>20 entraînements</Text>
        <View style={[s.row, { gap: 6, marginTop: 4 }]}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[s.muted, s.grow]}>15 – 21 septembre</Text>
          <Text style={[s.small, { color: colors.primary, backgroundColor: colors.primarySurface, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5 }]}>En cours</Text>
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[s.body, { color: colors.successText, backgroundColor: colors.successSurface, alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 9, padding: 7, marginTop: 7 }]}>+300 XP par membre</Text>
      </View>
    </View>
      <View style={[s.row, { borderTopWidth: 0.5, borderColor: colors.border, paddingTop: 8 }]}><View style={s.grow}><ProgressRing progress={count / 20 * 100} size={Math.min(158, width * 0.34)} strokeWidth={11}><Text style={[s.number, { fontSize: 32 }]}>{Math.round(count)}</Text><Text style={[s.muted, s.bold]}>/ 20</Text><Text style={s.muted}>séances</Text></ProgressRing></View><View style={[s.row, { flex: 1, borderLeftWidth: 0.5, borderColor: colors.border, paddingLeft: 20, minHeight: 72, gap: 6 }]}><Text style={[s.number, { fontSize: 32 }]}>6</Text><Text style={s.muted}>restantes</Text></View></View>
    </Panel>
    <Heading>Contributions</Heading><Panel><View>{members.map((member, index) => <Row key={member.id} last={index === 3} onPress={() => onMember(member.id)}><Avatar member={member} short /><Text style={[s.body, s.bold, { width: 70 }]}>{member.name}</Text><View style={s.grow}><Text style={[s.muted, { marginBottom: 4 }]}>{member.sessions} séances</Text><ProgressBar progress={member.sessions / 5 * 100} height={7} /></View><Text style={s.muted}>{member.sessions} / 5</Text></Row>)}</View></Panel>
    <Heading>Règles</Heading><Panel><View>{[
      { icon: 'dumbbell' as const, tone: 'purple' as const, text: 'Musculation et boxe comptabilisées' },
      { icon: 'clock' as const, tone: 'green' as const, text: '1 séance minimum de 30 min' },
      { icon: 'calendar' as const, tone: 'coral' as const, text: 'Maximum 1 contribution par jour' },
    ].map((rule, index) => <Row key={rule.text} last={index === 2}><TileIcon name={rule.icon} tone={rule.tone} size={34} /><Text style={[s.body, s.grow, { fontSize: 12 }]}>{rule.text}</Text><Symbol name="chevron" color="textSecondary" size={16} /></Row>)}</View></Panel>
    <Panel><View style={s.row}><TileIcon name="calendar" tone="blue" size={34} /><Text style={[s.body, s.grow]}>Fin dimanche · 23:59</Text><Symbol name="chevron" color="textSecondary" size={16} /></View></Panel>
    <View style={s.stack}><Action text="Voir mes séances prévues" onPress={onProgram} /><Action text="Historique du challenge" outline /></View>
  </>;
}
