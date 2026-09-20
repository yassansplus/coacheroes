import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { changes } from '../data';
import { dayLabel, weekRange } from '../utils';
import { CoachIcon, CoachRow, tones } from './CoachUI';
import { s } from './styles';

export function ModificationProposal({ createdAt, onCompare, onRefuse, onDetail }: { createdAt: number; onCompare: () => void; onRefuse: () => void; onDetail: (title: string, body: string) => void }) {
  return <>
    <View style={{ alignItems: 'center', gap: 8 }}><Illustration name="coach" size={56} /><Text style={[s.title, s.center]}>Modification proposée</Text><Text style={[s.body, s.center]}>Semaine du {dayLabel(weekRange(createdAt).start)}</Text></View>
    <Card style={s.card}><View style={s.row}><CoachIcon icon="dumbbell" tone="green" size={64} /><View style={[s.grow, { gap: 7 }]}><Text style={s.heading}>Muscu B allégée</Text><Text style={[s.label, { color: colors.accent, backgroundColor: colors.accentSurface, alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 3, fontSize: 11 }]}>Temporaire · 1 semaine</Text></View></View></Card>
    <Card style={{ padding: 16 }}><Text style={[s.heading, { marginBottom: 8 }]}>Changements</Text>{changes.map((item, index) => <CoachRow key={item.id} divider={index > 0} title={item.name} description={<Text style={{ color: tones[item.tone][1] }}>{item.id === 'lateral' ? item.after : `${item.before} → ${item.after}`}</Text>} icon={<CoachIcon glyph={item.glyph} tone={item.tone} />} onPress={() => onDetail(item.name, item.detail)} />)}</Card>
    <Card style={{ padding: 16 }}><Text style={[s.heading, { marginBottom: 8 }]}>Ce qui ne change pas</Text>{[
      ['Charges principales', 'Les charges de chaque exercice conservé restent identiques.'],
      ['Séance de boxe samedi', 'La séance de boxe est conservée dans le programme.'],
      ['Objectif hebdomadaire', 'L’objectif général reste le même ; seule la charge de travail de Muscu B est adaptée.'],
    ].map(([title, body], index) => <CoachRow key={title} divider={index > 0} title={title} icon={<CoachIcon glyph="check" tone="green" size={34} />} onPress={() => onDetail(title, body)} />)}</Card>
    <View style={s.footer}><Button text="Comparer les versions" trailing={<Symbol name="arrow" color="white" />} onPress={onCompare} /><Button text="Refuser" variant="outline" onPress={onRefuse} /></View>
  </>;
}
