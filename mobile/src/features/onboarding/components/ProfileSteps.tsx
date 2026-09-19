import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { ChoiceCard } from '@/components/ChoiceCard';
import { Illustration } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

import { goals, levels } from '../data';
import type { StepProps } from '../types';
import { normalizeNumber, toggleItem } from '../utils';
import { StepHeading, stepStyles as s } from './StepContent';

export function GoalStep({ profile, update }: StepProps) {
  return <>
    <StepHeading title="Quels sont tes objectifs ?" subtitle="Tu peux en sélectionner un ou plusieurs pour personnaliser ton programme." />
    <View style={[s.grid, styles.goals]}>{goals.map(goal => <ChoiceCard key={goal.value} title={goal.title}
      description={goal.description} selected={profile.goal.includes(goal.value)} onPress={() => update({ goal: toggleItem(profile.goal, goal.value) })}
      icon={<Illustration name={goal.icon} size={85} />} style={s.half} contentStyle={styles.goalCard} />)}</View>
  </>;
}

export function ProfileStep({ profile, update }: StepProps) {
  return <>
    <StepHeading title="Tes informations" centered />
    <Illustration name="profile" style={[s.hero, styles.profileHero]} />
    {([
      ['age', 'Âge', '28', 'ans'], ['height', 'Taille', '176', 'cm'], ['weight', 'Poids', '75,0', 'kg'],
    ] as const).map(([key, label, placeholder, unit]) => <Card key={key} style={styles.numberCard}>
      <TextField label={label} value={profile[key]} onChangeText={value => update({ [key]: value })}
        formatValue={normalizeNumber} placeholder={placeholder} keyboardType={key === 'weight' ? 'decimal-pad' : 'number-pad'}
        maxLength={key === 'weight' ? 5 : 3} fieldStyle={styles.numberField} inputStyle={styles.numberInput}
        labelStyle={styles.numberLabel} rightAccessory={<Text style={styles.unit}>{unit}</Text>} />
    </Card>)}
    <TabSelector value={profile.gender} onChange={gender => update({ gender })} items={[
      { value: 'male', label: 'Homme' }, { value: 'female', label: 'Femme' }, { value: 'other', label: 'Autre' },
    ]} />
    <View style={s.info}><Symbol name="info" color="textMuted" size={18} /><Text style={[s.body, s.grow]}>Ces données servent à calculer tes besoins.</Text></View>
  </>;
}

export function LevelStep({ profile, update }: StepProps) {
  return <>
    <StepHeading title="Ton niveau actuel" subtitle="Cela nous aide à personnaliser ton programme en fonction de ton expérience." centered />
    <Illustration name="level" style={[s.hero, styles.levelHero]} />
    <View style={s.stack}>{levels.map(level => <ChoiceCard key={level.value} layout="row" role="radio" indicatorPosition="trailing"
      title={level.title} description={level.description} selected={profile.level === level.value} onPress={() => update({ level: level.value })}
      icon={<View style={styles.levelIcon}><Illustration name={level.icon} size={48} /></View>} contentStyle={styles.levelCard} />)}</View>
  </>;
}

const styles = StyleSheet.create({
  goals: { flexGrow: 1, paddingTop: 5, paddingBottom: 10 }, goalCard: { minHeight: 210, paddingTop: 23, paddingHorizontal: 16, gap: 14 },
  profileHero: { width: '64%', height: 118 }, levelHero: { width: '64%', height: 112 },
  numberCard: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20 },
  numberField: { borderWidth: 0, borderRadius: 8, minHeight: 42, paddingHorizontal: 0 },
  numberInput: { fontFamily: fontFamily.bold, fontSize: 30, paddingVertical: 0, color: colors.text },
  numberLabel: { fontFamily: fontFamily.medium, color: colors.textSecondary, fontSize: 12, marginBottom: 3 },
  unit: { fontFamily: fontFamily.medium, color: colors.textSecondary, fontSize: 15 },
  levelCard: { minHeight: 80, borderRadius: 19 },
  levelIcon: { padding: 4, borderRadius: 16, backgroundColor: colors.primarySurface },
});
