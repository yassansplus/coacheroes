import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { colors, gradients } from '@/theme/colors';
import type { Member } from '../data';
import { Action, Heading, Panel, Row, s, TileIcon } from './UI';

export function MemberProfile({ member, onCompare, onActivity }: { member: Member; onCompare: () => void; onActivity: () => void }) {
  return <>
    <Panel><View style={[s.row, { paddingVertical: 8 }]}><View><LinearGradient colors={gradients.primary} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 7, borderColor: colors.accentSurface, alignItems: 'center', justifyContent: 'center' }}><Text style={[s.number, { color: colors.white, fontSize: 38 }]}>{member.name[0]}</Text></LinearGradient><View style={{ position: 'absolute', width: 17, height: 17, borderRadius: 9, backgroundColor: colors.success, borderWidth: 2, borderColor: colors.white, bottom: 5, right: 1 }} /></View><View style={[s.grow, { gap: 5 }]}><View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 5 }]}><Text style={[s.title, { fontSize: 21 }]}>{member.name}</Text><View style={[s.row, { gap: 4, padding: 6, borderRadius: 12, backgroundColor: colors.successSurface }]}><Symbol name="lock" size={12} color="successText" /><Text style={[s.small, { color: colors.successText, fontSize: 9 }]}>Données partagées</Text></View></View><Text style={s.muted}>Niveau {member.level} · Assidu</Text></View></View></Panel>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[
      { label: 'XP cette semaine', value: member.xp.toLocaleString('fr-FR'), icon: 'chart' as const, tone: 'purple' as const },
      { label: 'Séances', value: String(member.sessions), icon: 'calendar' as const, tone: 'green' as const },
      { label: 'Assiduité', value: `${member.attendance} %`, icon: 'target' as const, tone: 'coral' as const },
      { label: 'Série', value: `${member.streak} jours`, icon: 'flame' as const, tone: 'gold' as const },
    ].map(metric => <Card key={metric.label} style={[s.row, { width: '48%', flexGrow: 1, padding: 12, borderRadius: 18, gap: 9 }]}><TileIcon name={metric.icon} tone={metric.tone} size={46} /><View style={s.grow}><Text style={[s.small, { fontSize: 10 }]}>{metric.label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.number, { fontSize: 23, marginTop: 4 }]}>{metric.value}</Text></View></Card>)}</View>
    <Heading>Répartition sportive</Heading><Panel>{[{ name: 'Musculation', icon: 'dumbbell' as const, count: 2, tone: 'purple' as const }, { name: 'Boxe', icon: 'boxing' as const, count: member.sessions - 2, tone: 'coral' as const }].map(sport => <View key={sport.name} style={[s.row, { paddingVertical: 4 }]}><TileIcon name={sport.icon} tone={sport.tone} size={48} /><View style={s.grow}><View style={[s.row, { justifyContent: 'space-between', marginBottom: 9 }]}><Text style={[s.body, s.bold]}>{sport.name}</Text><Text style={s.muted}>{sport.count} séances</Text></View><ProgressBar progress={sport.count / 3 * 100} height={12} gradientColors={sport.tone === 'coral' ? [colors.energy, colors.squadCoral] : undefined} /></View></View>)}</Panel>
    <Heading>Records partagés</Heading><Panel><View><Row><TileIcon name="dumbbell" size={46} /><Text style={[s.body, s.bold, s.grow]}>Tractions</Text><Text style={s.title}>{member.pullups}</Text><Symbol name="chevron" size={17} color="textMuted" /></Row><Row last><TileIcon name="punchingBag" tone="green" size={46} /><View style={s.grow}><Text style={[s.body, s.bold]}>Sac</Text><Text style={[s.muted, { marginTop: 3 }]}>{member.strikes} frappes en 3 min</Text></View><Symbol name="chevron" size={17} color="textMuted" /></Row></View></Panel>
    <View style={[s.stack, { marginTop: 5 }]}><Action text="Comparer l’assiduité" onPress={onCompare} /><Action text="Voir l’activité" outline onPress={onActivity} /></View>
  </>;
}
