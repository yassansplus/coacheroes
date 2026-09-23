import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { colors, gradients } from '@/theme/colors';
import { members, type MemberId } from '../data';
import { Action, Avatar, Heading, Info, Panel, Row, s, TileIcon } from './UI';

export function Ranking({ week, onWeek, onMember }: { week: number; onWeek: (value: number) => void; onMember: (id: MemberId) => void }) {
  const start = new Date(2026, 8, 15 + week * 7), end = new Date(2026, 8, 21 + week * 7);
  const period = start.getMonth() === end.getMonth() ? `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'long' })}` : `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
  return <>
    <Panel><View style={[s.row, { justifyContent: 'space-between' }]}><IconButton accessibilityLabel="Semaine précédente" size={34} variant="ghost" icon={<Symbol name="back" size={18} />} onPress={() => onWeek(week - 1)} /><Text style={s.title}>{period}</Text>{week < 0 ? <IconButton accessibilityLabel="Semaine suivante" size={34} variant="ghost" icon={<Symbol name="chevron" size={18} />} onPress={() => onWeek(week + 1)} /> : <View style={{ width: 34 }} />}</View></Panel>
    <Panel><Info>Classement basé sur l’XP de régularité.</Info></Panel>
    {week === 0 ? <><Panel><View>{members.map((member, index) => <View key={member.id} style={{ borderRadius: 15, overflow: 'hidden' }}>{index === 0 ? <LinearGradient colors={gradients.selection} style={{ position: 'absolute', inset: 0 }} /> : null}<Row onPress={() => onMember(member.id)} last={index === 0 || index === 3}><Text style={[s.number, { fontSize: 22, width: 20, textAlign: 'center', color: index === 0 ? colors.primary : colors.textSecondary }]}>{index + 1}</Text><Avatar member={member} size={44} /><View style={[s.grow, { paddingVertical: 8, paddingRight: 5 }]}><View style={[s.row, { justifyContent: 'space-between', gap: 3 }]}><Text style={[s.title, { fontSize: 14 }]}>{member.name}</Text><Text style={[s.title, { fontSize: 14, color: index === 0 ? colors.squadPurple : colors.text }]}>{member.xp.toLocaleString('fr-FR')} XP</Text></View><Text style={[s.muted, { marginVertical: 3 }]}>{member.actions} actions</Text><ProgressBar progress={member.xp / 5000 * 100} height={7} gradientColors={index === 0 ? undefined : [member.color, member.color]} /></View></Row></View>)}</View></Panel>
      <Heading>Ton XP</Heading><Panel>{[
        { label: 'Entraînements', value: 1900, icon: 'dumbbell' as const, tone: 'purple' as const, color: colors.squadPurple },
        { label: 'Missions', value: 920, icon: 'clipboard' as const, tone: 'coral' as const, color: colors.squadCoral },
        { label: 'Nutrition', value: 620, icon: 'apple' as const, tone: 'green' as const, color: colors.squadGreen },
        { label: 'Check-ins', value: 380, icon: 'calendar' as const, tone: 'gold' as const, color: colors.squadGold },
      ].map(item => <View key={item.label} style={s.row}><TileIcon name={item.icon} tone={item.tone} size={33} /><View style={s.grow}><Text style={[s.body, { marginBottom: 3 }]}>{item.label}</Text><ProgressBar progress={item.value / 2600 * 100} gradientColors={[item.color, item.color]} height={7} /></View><Text style={[s.body, s.bold, { width: 40, textAlign: 'right' }]}>{item.value.toLocaleString('fr-FR')}</Text></View>)}</Panel></> : <Panel><EmptyState title="Aucun classement enregistré" description="L’historique des semaines précédentes sera disponible lorsque les données seront connectées." /></Panel>}
    <Panel><Info>Les performances absolues et le poids ne comptent pas.</Info></Panel>
    <Action text="Voir le classement précédent" outline onPress={() => onWeek(week - 1)} />
  </>;
}
