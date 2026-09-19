import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Card } from '@/components/Card';
import { ChoiceCard } from '@/components/ChoiceCard';
import { EmptyState } from '@/components/EmptyState';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TagInput } from '@/components/TagInput';
import { TextField } from '@/components/TextField';
import { colors } from '@/theme/colors';

import { foods } from '../data';
import type { FoodInputs, FoodSection, StepProps } from '../types';
import { foodLabel, toggleItem } from '../utils';
import { SectionHeading, StepHeading, stepStyles as s } from './StepContent';

const habits: { key: 'meals' | 'cooking' | 'restaurants' | 'tracking'; title: string; subtitle: string;
  icon: IllustrationName; items: { value: string; label: string }[] }[] = [
  { key: 'meals', title: 'Nombre de repas', subtitle: 'Combien de repas manges-tu par jour ?', icon: 'cutlery',
    items: ['2', '3', '4', '5+'].map(value => ({ value, label: value })) },
  { key: 'cooking', title: 'Tu cuisines ?', subtitle: 'À quelle fréquence cuisines-tu tes repas ?', icon: 'salad',
    items: [{ value: 'rarely', label: 'Rarement' }, { value: 'sometimes', label: 'Parfois' }, { value: 'often', label: 'Souvent' }] },
  { key: 'restaurants', title: 'Repas au restaurant', subtitle: 'Combien de fois par semaine manges-tu au restaurant ?', icon: 'house',
    items: [{ value: '0-1', label: '0 – 1' }, { value: '2-3', label: '2 – 3' }, { value: '4+', label: '4+' }] },
  { key: 'tracking', title: 'Suivi actuel', subtitle: 'Suis-tu déjà ton alimentation ?', icon: 'calendar',
    items: [{ value: 'none', label: 'Aucun' }, { value: 'calories', label: 'Calories' }, { value: 'macros', label: 'Macros' }] },
];

export function EatingHabitsStep({ profile, update }: StepProps) {
  return <>
    <StepHeading title="Tes habitudes alimentaires" subtitle="Aide-nous à comprendre ton quotidien pour un accompagnement vraiment adapté." icon="salad" />
    {habits.map(habit => <Card key={habit.key} style={[s.section, styles.habit]}>
      <SectionHeading title={habit.title} subtitle={habit.subtitle} icon={habit.icon} />
      <TabSelector value={profile[habit.key]} onChange={value => update({ [habit.key]: value })} items={habit.items} style={styles.tabs} />
    </Card>)}
  </>;
}

export function FoodPreferencesStep({ profile, update, foodInputs, onFoodChange }: StepProps & {
  foodInputs: FoodInputs;
  onFoodChange: (section: FoodSection, values: string[], inputValue: string) => void;
}) {
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const matches = foods.filter(food => normalize(food.title).includes(normalize(query.trim())));
  function select(value: string, section: FoodSection) {
    const current = section === 'liked' ? profile.likedFoods : profile.avoidedFoods;
    const next = value === 'none' ? current.includes('none') ? [] : ['none'] : toggleItem(current.filter(item => item !== 'none'), value);
    onFoodChange(section, next, value === 'none' ? '' : foodInputs[section]);
  }
  return <>
    <StepHeading title="Tes préférences alimentaires" subtitle="Sélectionne les aliments que tu aimes et ceux que tu préfères éviter afin de recevoir un plan adapté à tes habitudes." />
    <TextField accessibilityLabel="Rechercher un aliment" value={query} onChangeText={setQuery} placeholder="Rechercher un aliment"
      leftAccessory={<Symbol name="search" size={20} color="textSecondary" />} inputStyle={{ paddingLeft: 10 }} />
    {(['liked', 'avoided'] as const).map(section => <View key={section} style={s.stack}>
      <SectionHeading title={section === 'liked' ? 'Aliments appréciés' : 'À éviter'}
        trailing={section === 'liked' ? <Text style={s.caption}>{profile.likedFoods.length} sélectionnés</Text> : undefined} />
      <View style={s.grid}>{matches.filter(food => food.section === section).map(food => <ChoiceCard key={food.value}
        layout="chip" indicatorPosition="trailing" indicatorSize={18} title={food.title} selected={(section === 'liked' ? profile.likedFoods : profile.avoidedFoods).includes(food.value)}
        onPress={() => select(food.value, section)} icon={<Illustration name={food.icon} size={24} />}
        style={width < 400 ? s.half : s.third} contentStyle={styles.food} titleStyle={styles.foodTitle} />)}</View>
      <TagInput label={section === 'liked' ? 'Ajouter des aliments appréciés' : 'Ajouter des aliments à éviter'}
        helperText="Sépare les aliments par des virgules, ou appuie sur + pour les ajouter."
        placeholder={section === 'liked' ? 'Ex. : avocat, fraises, lentilles' : 'Ex. : brocoli, olives, champignons'}
        value={(section === 'liked' ? profile.likedFoods : profile.avoidedFoods).filter(value => value !== 'none').map(value => foodLabel(value, foods))}
        inputValue={foodInputs[section]} onChange={(values, inputValue) => onFoodChange(section, values, inputValue)} />
    </View>)}
    {!matches.length ? <EmptyState title="Aucun aliment trouvé" description="Ajoute cet aliment dans le champ libre de la section de ton choix." /> : null}
    <TextField label="Autre préférence ou allergie" value={profile.allergies} onChangeText={allergies => update({ allergies })}
      placeholder="Ex. : fruits de mer, soja, etc." maxLength={100} />
    <Text style={[s.caption, styles.counter]}>{profile.allergies.length}/100</Text>
  </>;
}

const styles = StyleSheet.create({
  habit: { gap: 10, paddingVertical: 14 }, tabs: { minHeight: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 16 },
  food: { borderColor: colors.border, paddingHorizontal: 6, paddingVertical: 12, gap: 4, minHeight: 52, borderRadius: 17 },
  foodTitle: { fontSize: 10, lineHeight: 15 }, counter: { textAlign: 'right', marginTop: -15 },
});
