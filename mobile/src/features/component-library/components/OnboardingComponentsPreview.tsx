import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ChoiceCard } from '@/components/ChoiceCard';
import { Illustration } from '@/components/Illustration';
import { NumberStepper } from '@/components/NumberStepper';
import { PhotoPicker } from '@/components/PhotoPicker';
import { ProgressRing } from '@/components/ProgressRing';
import { TagInput } from '@/components/TagInput';
import { WeekdaySelector } from '@/components/WeekdaySelector';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export function OnboardingComponentsPreview() {
  const [selected, setSelected] = useState('muscle');
  const [count, setCount] = useState(4);
  const [days, setDays] = useState([0, 2, 4, 6]);
  const [photo, setPhoto] = useState<string>();
  const [tags, setTags] = useState(['Avocat', 'Lentilles']);
  const [tagInput, setTagInput] = useState('');
  return <View style={styles.section}>
    <Text style={styles.title}>Primitives de l’onboarding</Text>
    <View style={styles.row}>
      <ChoiceCard role="radio" title="Musculation" icon={<Illustration name="dumbbell" size={55} />} selected={selected === 'muscle'} onPress={() => setSelected('muscle')} style={styles.grow} />
      <ChoiceCard role="radio" title="Boxe" icon={<Illustration name="boxing" size={55} />} selected={selected === 'boxing'} onPress={() => setSelected('boxing')} style={styles.grow} />
    </View>
    <Card style={styles.section}><Text style={styles.label}>Compteur numérique</Text><NumberStepper label="la valeur" value={count} onChange={setCount} minimum={1} maximum={7} size="large" />
      <Text style={styles.label}>Jours disponibles</Text><WeekdaySelector value={days} onChange={setDays} /></Card>
    <Card><TagInput label="Saisie libre en tags" value={tags} inputValue={tagInput}
      onChange={(values, inputValue) => { setTags(values); setTagInput(inputValue); }} placeholder="Ex. : avocat, lentilles" /></Card>
    <Card style={styles.row}><View style={styles.grow}><ProgressRing progress={72} size={130} strokeWidth={6} double><Illustration name="brain" size={46} /><Text style={styles.label}>72 %</Text></ProgressRing></View>
      <PhotoPicker label="Photo" value={photo} onChange={setPhoto} /></Card>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 15 }, row: { flexDirection: 'row', gap: 12, alignItems: 'stretch' }, grow: { flex: 1 },
  title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 16 },
  label: { color: colors.textSecondary, fontFamily: fontFamily.semiBold, fontSize: 12 },
});
