import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { observations } from '../data';
import { CoachIcon, CoachRow } from './CoachUI';
import { s } from './styles';

export function AdjustmentReasons({ onContinue, onChat, onRule, onKeep, fromComparison = false }: { onContinue: () => void; onChat: () => void; onRule: () => void; onKeep: () => void; fromComparison?: boolean }) {
  return <>
    <Card style={s.card}><View style={s.row}><CoachIcon icon="dumbbell" size={66} /><View style={s.grow}><Text style={s.label}>Muscu B</Text><Text style={[s.title, { color: colors.energy }]}>Volume −22 %</Text><Text style={s.caption}>Pour la période que tu choisiras</Text></View></View></Card>
    <Card style={s.card}><Text style={s.heading}>Données utilisées</Text>{observations.map((item, index) => <View key={item.label} style={[s.row, index > 0 && s.divider, { paddingTop: index ? 12 : 0, gap: 8 }]}>
      <CoachIcon icon={item.icon} glyph={item.glyph} tone={item.tone} size={40} /><View style={s.grow}><Text style={[s.label, { fontSize: 12 }]}>{item.label}</Text><Text style={s.heading}>{item.value}</Text></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 24, backgroundColor: colors.energySurface }}><Symbol name="warning" color="energy" size={15} /><Text style={[s.caption, { color: colors.energy, fontSize: 10 }]}>{item.status}</Text></View>
    </View>)}</Card>
    <Card style={{ padding: 16 }}><Text style={[s.heading, { marginBottom: 8 }]}>Conséquences</Text>
      <CoachRow title="18 → 14 séries" icon={<CoachIcon glyph="chart" tone="green" />} />
      <CoachRow divider title="2 exercices épaules → 1" icon={<CoachIcon icon="dumbbell" tone="purple" />} />
      <CoachRow divider title="2 reps en réserve → 3" icon={<CoachIcon glyph="clipboard" />} />
    </Card>
    <Card style={{ paddingHorizontal: 16, paddingVertical: 2 }}><CoachRow title="Règle d’adaptation utilisée" icon={<CoachIcon glyph="clipboard" tone="neutral" />} onPress={onRule} /></Card>
    <View style={s.footer}><Button text={fromComparison ? 'Retour à la comparaison' : 'Voir la séance modifiée'} trailing={<Symbol name="arrow" color="white" />} hapticFeedback="light" onPress={onContinue} />
      {!fromComparison ? <Button text="Garder ma séance" variant="outline" onPress={onKeep} /> : null}
      <Button text="Retour au chat" variant="secondary" backgroundColor="transparent" textColor={colors.primary} onPress={onChat} />
    </View>
  </>;
}
