import { Text } from '@/components/LocalizedText';
import { localizeLabel, getLocale } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EmptyState } from '@/components/EmptyState';
import { IconButton } from '@/components/IconButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { colors, gradients } from '@/theme/colors';
import type { SquadGroupDetail } from '@/services/squad';
import { Action, Avatar, Heading, Info, Panel, Row, s, TileIcon } from './UI';

export function Ranking({ detail, week, onWeek, onMember }: { detail: SquadGroupDetail; week: number; onWeek: (value: number) => void; onMember: (id: string) => void }) {
  useLanguage();
  const index = 11 + week;
  const date = detail.members[0]?.stats.weekly[index]?.date;
  const start = date ? new Date(`${date}T12:00:00Z`) : null;
  const end = start ? new Date(start.getTime() + 6 * 86400000) : null;
  const period = start && end ? `${start.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' })}` : 'Semaine indisponible';
  const members = detail.members.slice().sort((a, b) => (b.stats.weekly[index]?.count ?? 0) - (a.stats.weekly[index]?.count ?? 0));
  const total = members.reduce((sum, member) => sum + (member.stats.weekly[index]?.count ?? 0), 0);
  return <>
    <Panel><View style={[s.row, { justifyContent: 'space-between' }]}>{index > 0 ? <IconButton accessibilityLabel={localizeLabel("Semaine précédente")} size={34} variant="ghost" icon={<Symbol name="back" size={18} />} onPress={() => onWeek(week - 1)} /> : <View style={{ width: 34 }} />}<Text style={s.title}>{period}</Text>{week < 0 ? <IconButton accessibilityLabel={localizeLabel("Semaine suivante")} size={34} variant="ghost" icon={<Symbol name="chevron" size={18} />} onPress={() => onWeek(week + 1)} /> : <View style={{ width: 34 }} />}</View></Panel>
    <Panel><Info>Classement basé sur les séances terminées cette semaine.</Info></Panel>
    {total ? <Panel><View>{members.map((member, position) => <View key={member.id} style={{ borderRadius: 15, overflow: 'hidden' }}>{position === 0 ? <LinearGradient colors={gradients.selection} style={{ position: 'absolute', inset: 0 }} /> : null}<Row onPress={() => onMember(member.id)} last={position === members.length - 1}><Text style={[s.number, { fontSize: 22, width: 20, textAlign: 'center', color: position === 0 ? colors.primary : colors.textSecondary }]}>{position + 1}</Text><Avatar member={member} size={44} /><View style={[s.grow, { paddingVertical: 8, paddingRight: 5 }]}><View style={[s.row, { justifyContent: 'space-between', gap: 3 }]}><Text translate={false} style={[s.title, { fontSize: 14 }]}>{member.name}</Text><Text style={[s.title, { fontSize: 14, color: position === 0 ? colors.squadPurple : colors.text }]}>{member.stats.weekly[index]?.count ?? 0} séances</Text></View><ProgressBar progress={total ? (member.stats.weekly[index]?.count ?? 0) / total * 100 : 0} height={7} gradientColors={position === 0 ? undefined : [colors.squadPurple, colors.squadPurple]} /></View></Row></View>)}</View></Panel> : <Panel><EmptyState title="Aucune séance enregistrée" description="Le classement se remplira avec les entraînements terminés." /></Panel>}
    <Heading>Le groupe cette semaine</Heading><Panel><Row last><TileIcon name="dumbbell" tone="green" size={33} /><Text style={[s.body, s.grow]}>Séances terminées</Text><Text style={s.body}>{total}</Text></Row></Panel>
    <Panel><Info>Les charges, le poids et les données de santé ne comptent pas dans ce classement.</Info></Panel>
    {index > 0 ? <Action text="Voir la semaine précédente" outline onPress={() => onWeek(week - 1)} /> : null}
  </>;
}
