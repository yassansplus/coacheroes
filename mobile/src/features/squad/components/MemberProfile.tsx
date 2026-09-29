import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { useLanguage } from '@/i18n/useLanguage';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { colors, gradients } from '@/theme/colors';
import { sportLabel, type Member } from '../data';
import { Action, Avatar, Heading, Panel, Row, s, TileIcon } from './UI';

export function MemberProfile({ member, onCompare, onActivity, onRemoveFriend }: {
  member: Member; onCompare?: () => void; onActivity: () => void; onRemoveFriend?: () => void;
}) {
  useLanguage();
  const stats = member.stats;
  const sports = stats.sports.slice().sort((a, b) => b.count - a.count);
  const totalSports = sports.reduce((sum, item) => sum + item.count, 0);
  return <>
    <Panel><View style={[s.row, { paddingVertical: 8 }]}><View><LinearGradient colors={gradients.primary} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 7, borderColor: colors.accentSurface, alignItems: 'center', justifyContent: 'center' }}><Avatar member={member} short size={66} /></LinearGradient></View><View style={[s.grow, { gap: 5 }]}><View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 5 }]}><Text translate={false} style={[s.title, { fontSize: 21 }]}>{member.name}</Text><View style={[s.row, { gap: 4, padding: 6, borderRadius: 12, backgroundColor: colors.successSurface }]}><Symbol name="lock" size={12} color="successText" /><Text style={[s.small, { color: colors.successText, fontSize: 9 }]}>{member.details ? 'Progression partagée' : 'Contribution au groupe'}</Text></View></View><Text style={s.muted}>{member.isFriend ? 'Ami' : member.role === 'owner' ? 'Créateur du groupe' : 'Membre du groupe'}</Text></View></View></Panel>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[
      { label: 'Séances semaine', value: String(stats.sessionsWeek), icon: 'chart' as const, tone: 'purple' as const },
      { label: 'Sur 28 jours', value: stats.sessions28 === null ? '—' : String(stats.sessions28), icon: 'calendar' as const, tone: 'green' as const },
      { label: 'Assiduité', value: stats.attendance === null ? '—' : `${stats.attendance} %`, icon: 'target' as const, tone: 'coral' as const },
      { label: 'Série', value: stats.streak === null ? '—' : t("{p0} jours", { p0: stats.streak }), icon: 'flame' as const, tone: 'gold' as const },
    ].map(metric => <Card key={metric.label} style={[s.row, { width: '48%', flexGrow: 1, padding: 12, borderRadius: 18, gap: 9 }]}><TileIcon name={metric.icon} tone={metric.tone} size={46} /><View style={s.grow}><Text style={[s.small, { fontSize: 10 }]}>{metric.label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={[s.number, { fontSize: 23, marginTop: 4 }]}>{metric.value}</Text></View></Card>)}</View>
    {member.details ? <><Heading>Répartition sportive</Heading><Panel>{sports.length ? sports.map((sport, index) => <View key={sport.sport} style={[s.row, { paddingVertical: 4 }]}><TileIcon name={sport.sport === 'boxing' ? 'boxing' : 'dumbbell'} tone={index ? 'coral' : 'purple'} size={48} /><View style={s.grow}><View style={[s.row, { justifyContent: 'space-between', marginBottom: 9 }]}><Text style={[s.body, s.bold]}>{sportLabel(sport.sport)}</Text><Text style={s.muted}>{sport.count} séances</Text></View><ProgressBar progress={totalSports ? sport.count / totalSports * 100 : 0} height={12} /></View></View>) : <Text style={s.muted}>Aucune séance enregistrée sur les 28 derniers jours.</Text>}</Panel>
      {stats.records.length ? <><Heading>Performances partagées</Heading><Panel><View>{stats.records.map((record, index) => <Row key={record.id} last={index === stats.records.length - 1}><TileIcon name="dumbbell" size={46} /><Text style={[s.body, s.bold, s.grow]}>{record.title}</Text><Text style={s.title}>{record.value}</Text></Row>)}</View></Panel></> : null}</> : <Panel><Text style={s.muted}>Ajoute cette personne en ami pour voir sa progression sportive partagée.</Text></Panel>}
    <View style={[s.stack, { marginTop: 5 }]}>{onCompare ? <Action text="Comparer l’assiduité" onPress={onCompare} /> : null}<Action text="Voir l’activité" outline onPress={onActivity} />{onRemoveFriend ? <Action text="Retirer de mes amis" outline onPress={onRemoveFriend} /> : null}</View>
  </>;
}
