import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { RadioButton } from '@/components/RadioButton';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { changes } from '../data';
import { dayLabel, weekRange } from '../utils';
import { CoachIcon } from './CoachUI';
import { s } from './styles';

export function ModificationDecision({ scope, onScope, onApply, onKeep, onAdjust }: { scope: 'week' | 'ongoing'; onScope: (value: 'week' | 'ongoing') => void; onApply: () => void; onKeep: () => void; onAdjust: () => void }) {
  const week = weekRange(Date.now());
  return <>
    <Text style={[s.title, s.center, { marginBottom: 8 }]}>Décision</Text>
    <Card style={s.card}><View style={s.row}><CoachIcon icon="dumbbell" tone="purple" size={66} /><View style={[s.grow, { gap: 4 }]}><Text style={s.heading}>Muscu B allégée</Text><Text style={[s.label, { color: colors.accent }]}>{changes.length} modifications</Text><Text style={s.body}>{scope === 'week' ? `Du ${dayLabel(week.start)} au ${dayLabel(week.end)}` : 'Jusqu’à nouvel ordre'}</Text></View></View></Card>
    <Card style={[s.card, { gap: 12 }]}><Text style={s.heading}>Application</Text>
      <RadioButton label="Cette semaine uniquement" selected={scope === 'week'} onSelect={() => onScope('week')} style={{ padding: 16, minHeight: 66, borderRadius: 18, backgroundColor: scope === 'week' ? colors.primarySurface : colors.surface, borderColor: colors.border, borderWidth: scope === 'week' ? 0 : 1 }} />
      <RadioButton label="Jusqu’à nouvel ordre" selected={scope === 'ongoing'} onSelect={() => onScope('ongoing')} style={{ padding: 16, minHeight: 66, borderRadius: 18, backgroundColor: scope === 'ongoing' ? colors.primarySurface : colors.surface, borderColor: colors.border, borderWidth: scope === 'ongoing' ? 0 : 1 }} />
    </Card>
    <Card style={s.card}><View style={s.row}><CoachIcon glyph="calendar" tone="green" /><View style={s.grow}><Text style={s.label}>{scope === 'week' ? 'Retour automatique au programme initial' : 'Retour au programme initial à ta demande'}</Text><Text style={s.body}>{scope === 'week' ? dayLabel(week.reset) : 'Depuis Mon programme'}</Text></View></View></Card>
    <View style={[s.footer, { marginTop: 20 }]}><Button text="Appliquer les changements" trailing={<Symbol name="arrow" color="white" />} hapticFeedback="medium" onPress={onApply} /><Button text="Conserver le programme actuel" variant="outline" onPress={onKeep} /><Button text="Ajuster avec le coach" variant="secondary" backgroundColor="transparent" textColor={colors.primary} onPress={onAdjust} /></View>
    <Text style={[s.caption, s.center]}>Tu peux modifier cette décision depuis Programme.</Text>
  </>;
}
