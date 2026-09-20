import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { changes, comparison } from '../data';
import { CoachIcon, CoachRow } from './CoachUI';
import { s } from './styles';

export function CompareVersions({ onContinue, onData, onDetail }: { onContinue: () => void; onData: () => void; onDetail: (title: string, text: string) => void }) {
  return <>
    <View style={{ gap: 6 }}><Text style={[s.title, s.center]}>Comparer</Text><Text style={[s.body, s.center]}>Muscu B · Jeudi</Text></View>
    <Card style={{ padding: 12 }}><View style={[s.row, { gap: 4, marginBottom: 8 }]}><View style={{ flex: 1.25 }} /><Text style={[s.label, s.center, { flex: 1, backgroundColor: colors.background, borderRadius: 10, paddingVertical: 10 }]}>Actuel</Text><Text style={[s.label, s.center, { flex: 1, backgroundColor: colors.primarySurface, borderRadius: 10, paddingVertical: 10 }]}>Proposé</Text></View>
      {comparison.map(item => <View key={item.label} style={[s.row, s.divider, { paddingVertical: 12, gap: 4 }]}><View style={[s.row, { flex: 1.25, gap: 6 }]}><CoachIcon glyph={item.glyph} tone={item.tone} size={28} /><Text style={[s.label, { fontSize: 11, flex: 1 }]}>{item.label}</Text></View><Text style={[s.label, s.center, { flex: 1, fontSize: 13 }]}>{item.before}</Text><Text style={[s.label, s.center, { flex: 1, color: colors.primary, backgroundColor: colors.primarySurface, paddingVertical: 12, borderRadius: 12, fontSize: 13 }]}>{item.after}</Text></View>)}
    </Card>
    <Card style={{ padding: 16 }}><Text style={[s.heading, { marginBottom: 8 }]}>Exercices modifiés</Text>{changes.filter(item => item.id !== 'rir').map((item, index) => <CoachRow key={item.id} divider={index > 0} title={item.name} description={<><Text>{item.before} </Text><Text style={{ color: item.id === 'lateral' ? colors.energy : colors.primary }}>→ {item.after}</Text></>} icon={<CoachIcon glyph="dumbbell" tone={index ? 'purple' : 'blue'} />} onPress={() => onDetail(item.name, item.detail)} />)}</Card>
    <Card style={s.card}><View style={s.row}><CoachIcon glyph="clock" tone="red" /><View><Text style={s.label}>Durée prévue :</Text><Text style={[s.title, { color: colors.energy }]}>−15 min</Text></View></View></Card>
    <View style={s.footer}><Button text="Continuer" trailing={<Symbol name="arrow" color="white" />} onPress={onContinue} /><Button text="Voir les données utilisées" variant="secondary" backgroundColor="transparent" textColor={colors.primary} onPress={onData} /></View>
  </>;
}
