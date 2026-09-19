import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChoiceCard } from '@/components/ChoiceCard';
import { IconButton } from '@/components/IconButton';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { NumberStepper } from '@/components/NumberStepper';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { WeekdaySelector } from '@/components/WeekdaySelector';
import { colors } from '@/theme/colors';

import { complementarySports, equipmentOptions, sports } from '../data';
import type { Performance, StepProps } from '../types';
import { inRange, normalizeNumber, parseNumber, toggleComplementarySport, toggleItem } from '../utils';
import { SectionHeading, StepHeading, stepStyles as s } from './StepContent';

export function PerformanceStep({ profile, update }: StepProps) {
  const [editing, setEditing] = useState<Performance | 'new' | null>(null);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('kg');
  const [error, setError] = useState('');
  const setPerformance = (id: string, nextValue: number | null) => update({ performances: profile.performances.map(item => item.id === id ? { ...item, value: nextValue } : item) });
  function open(item: Performance | 'new') {
    setEditing(item); setName(item === 'new' ? '' : item.label); setValue(item === 'new' || item.value === null ? '' : String(item.value));
    setUnit(item === 'new' ? 'kg' : item.unit); setError('');
  }
  function save() {
    if (!name.trim() || !inRange(value, 0, 500)) { setError('Indique un exercice et une valeur entre 0 et 500.'); return; }
    if (unit === 'rep.' && !Number.isInteger(parseNumber(value))) { setError('Indique un nombre entier de répétitions.'); return; }
    if (editing === 'new') update({ performances: [...profile.performances, { id: `custom-${Date.now()}`, label: name.trim(), value: parseNumber(value), unit: unit as 'kg' | 'rep.' }] });
    else if (editing) setPerformance(editing.id, parseNumber(value));
    setEditing(null);
  }
  const renderRow = (item: Performance) => <View key={item.id} style={styles.performanceRow}>
    <View style={s.grow}><Text style={s.label}>{item.label}</Text>
      {item.id === 'pushups' ? <Text style={s.caption}>En une série, bonne forme</Text> : item.id === 'pullups' ? <Text style={s.caption}>En prise pronation, sans aide</Text> : null}
    </View>
    {item.value === null ? <Button variant="outline" text="Je ne sais pas" textColor={colors.textSecondary}
      onPress={() => open(item)} style={styles.unknown} textStyle={styles.unknownText} trailing={<Symbol name="chevron" color="textMuted" size={14} />} /> :
      <View style={styles.performanceValue}><NumberStepper label={item.label} value={item.value} onChange={value => setPerformance(item.id, value)} maximum={500} step={item.unit === 'kg' ? 2.5 : 1} />
        <IconButton accessibilityLabel={`Modifier ${item.label}`} variant="ghost" size={28} icon={<Text style={s.caption}>{item.unit}</Text>} onPress={() => open(item)} />
      </View>}
  </View>;
  return <>
    <StepHeading title="Tes performances actuelles" subtitle="Ces informations nous aident à personnaliser ton programme." icon="performances" iconSize={86} />
    <Card style={s.section}>
      <SectionHeading title="Poids du corps" subtitle="Combien de répétitions peux-tu faire ?" icon="bodyweight" />
      {profile.performances.filter(item => ['pushups', 'pullups'].includes(item.id)).map(renderRow)}
    </Card>
    <Card style={s.section}>
      <SectionHeading title="Charges habituelles" subtitle="Indique les charges avec lesquelles tu t’entraînes généralement." icon="dumbbell" />
      {profile.performances.filter(item => !['pushups', 'pullups'].includes(item.id)).map(renderRow)}
      <Button text="Ajouter un exercice" variant="secondary" backgroundColor="transparent" textColor={colors.primary}
        leading={<Symbol name="plus" color="primary" size={19} />} onPress={() => open('new')} style={s.link} textStyle={styles.unknownText} />
    </Card>
    <BottomSheet visible={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Ajouter un exercice' : name}>
      <View style={s.stack}>
        {editing === 'new' ? <TextField label="Exercice" value={name} onChangeText={setName} placeholder="Ex. : Développé militaire" maxLength={50} /> : null}
        <TextField label={unit === 'kg' ? 'Charge habituelle' : 'Répétitions'} value={value} onChangeText={setValue} keyboardType="decimal-pad"
          formatValue={normalizeNumber} placeholder="0" rightAccessory={<Text style={s.body}>{unit}</Text>} error={error || undefined} />
        {editing === 'new' ? <TabSelector value={unit} onChange={setUnit} items={[{ value: 'kg', label: 'Kilogrammes' }, { value: 'rep.', label: 'Répétitions' }]} /> : null}
        <Button text="Enregistrer" onPress={save} />
        {editing && editing !== 'new' ? <Button text="Je ne sais pas" variant="secondary" onPress={() => { setPerformance(editing.id, null); setEditing(null); }} /> : null}
      </View>
    </BottomSheet>
  </>;
}

export function SportsStep({ profile, update }: StepProps) {
  return <>
    <StepHeading title="Quels sports veux-tu pratiquer ?" subtitle="La musculation est la base. Ajoute d’autres sports si tu le souhaites." centered />
    <ChoiceCard title="Musculation uniquement" description="Aucun sport complémentaire."
      selected={!profile.sports.some(sport => sport !== 'strength')} onPress={() => update({ sports: ['strength'] })}
      icon={<Illustration name="dumbbell" size={48} />} layout="row" indicatorPosition="trailing" titleStyle={styles.sportTitle} />
    <SectionHeading title="Sports complémentaires" subtitle="Facultatif : sélectionne un ou plusieurs sports." />
    <View style={s.grid}>{complementarySports.map(sport => <ChoiceCard key={sport} title={sports[sport].title}
      selected={profile.sports.includes(sport)} onPress={() => update({ sports: toggleComplementarySport(profile.sports, sport) })}
      layout="chip" indicatorPosition="trailing" indicatorSize={20} style={s.half} contentStyle={styles.sportOption} />)}</View>
    <View style={s.divider} />
    <SectionHeading title="Où souhaites-tu t’entraîner ?" subtitle="Tu peux sélectionner plusieurs endroits." />
    <View style={s.grid}>{([
      ['gym', 'Salle', 'gym'], ['home', 'Maison', 'house'], ['club', 'Club', 'club'],
    ] as const).map(([value, title, icon]) => <ChoiceCard key={value} title={title} selected={profile.places.includes(value)}
      onPress={() => update({ places: toggleItem(profile.places, value) })} icon={<Illustration name={icon} size={63} />}
      indicatorPosition="bottom" style={s.third} contentStyle={styles.placeCard} titleStyle={styles.centeredTitle} />)}</View>
  </>;
}

export function AvailabilityStep({ profile, update }: StepProps) {
  return <>
    <Illustration name="availability" style={[s.hero, styles.calendarHero]} />
    <StepHeading title={'Quand peux-tu\nt’entraîner ?'} subtitle="On adapte ton programme à ton emploi du temps." centered />
    <Card style={[s.section, styles.availabilityCard]}>
      <SectionHeading title="Jours disponibles" subtitle="Sélectionne les jours où tu peux t’entraîner." />
      <WeekdaySelector value={profile.days} onChange={days => update({ days, sessions: Math.min(profile.sessions, Math.max(1, days.length)) })} />
    </Card>
    <Card style={[s.section, styles.availabilityCard]}>
      <SectionHeading title="Séances par semaine" subtitle="Combien de séances souhaites-tu faire ?" />
      <NumberStepper label="le nombre de séances" value={profile.sessions} minimum={1} maximum={Math.max(1, profile.days.length)}
        onChange={sessions => update({ sessions })} size="large" style={styles.sessionStepper} />
    </Card>
    <Card style={[s.section, styles.availabilityCard]}>
      <SectionHeading title="Moment de la journée" subtitle="À quel moment préfères-tu t’entraîner ?" />
      <TabSelector value={profile.timeOfDay} onChange={timeOfDay => update({ timeOfDay })} style={styles.tabs} items={[
        { value: 'morning', label: 'Matin' }, { value: 'noon', label: 'Midi' }, { value: 'evening', label: 'Soir' },
      ]} />
    </Card>
    <Card style={[s.section, styles.availabilityCard]}>
      <SectionHeading title="Durée des séances" subtitle="Quelle durée te convient le mieux ?" />
      <TabSelector value={profile.duration} onChange={duration => update({ duration })} style={styles.tabs}
        items={['45', '60', '90'].map(value => ({ value, label: `${value} min` }))} />
    </Card>
  </>;
}

export function EquipmentStep({ profile, update }: StepProps) {
  const [query, setQuery] = useState('');
  const custom = profile.equipment.filter(value => !equipmentOptions.some(option => option.value === value));
  function addEquipment() {
    const value = query.trim();
    if (!value) return;
    const known = equipmentOptions.find(option => option.title.toLocaleLowerCase('fr') === value.toLocaleLowerCase('fr'));
    if (!profile.equipment.some(item => item.toLocaleLowerCase('fr') === value.toLocaleLowerCase('fr')))
      update({ equipment: [...new Set([...profile.equipment, known?.value ?? value])] });
    setQuery('');
  }
  const gymTypes: { value: string; title: string; description: string; icon: IllustrationName }[] = [
    { value: 'full', title: 'Salle complète', description: 'Accès à une large gamme d’équipements', icon: 'fullGym' },
    { value: 'building', title: 'Salle d’immeuble', description: 'Équipement limité', icon: 'buildingGym' },
    { value: 'home', title: 'À la maison', description: 'Avec ou sans petit matériel', icon: 'homeGym' },
  ];
  return <>
    <StepHeading title="Ton matériel" subtitle="Dis-nous où tu t’entraînes et quel équipement tu as à disposition." />
    <SectionHeading title="Où t’entraînes-tu le plus souvent ?" />
    <View style={s.grid}>{gymTypes.map(item => <ChoiceCard key={item.value} role="radio" title={item.title} description={item.description}
      selected={profile.gymType === item.value} onPress={() => update({ gymType: item.value })} style={s.third}
      icon={<Illustration name={item.icon} style={styles.gymPhoto} />} contentStyle={styles.gymCard} titleStyle={styles.gymTitle} descriptionStyle={styles.gymDescription} />)}</View>
    <SectionHeading title="Équipement disponible" subtitle="Sélectionne tout ce que tu as à disposition." />
    <View style={s.grid}>{equipmentOptions.map(item => <ChoiceCard key={item.value} title={item.title}
      selected={profile.equipment.includes(item.value)} onPress={() => update({ equipment: toggleItem(profile.equipment, item.value) })}
      icon={<Illustration name={item.icon} size={51} />} style={s.third} contentStyle={styles.equipmentCard} titleStyle={styles.centeredTitle} />)}</View>
    <SectionHeading title="Ajouter du matériel" subtitle="Un équipement spécifique ? Ajoute-le ici." />
    <TextField accessibilityLabel="Rechercher ou ajouter du matériel" value={query} onChangeText={setQuery} placeholder="Rechercher ou ajouter du matériel" maxLength={40}
      leftAccessory={<Symbol name="search" color="textSecondary" size={20} />} inputStyle={styles.searchInput} onSubmitEditing={addEquipment}
      rightAccessory={<IconButton accessibilityLabel="Ajouter ce matériel" variant="ghost" size={34} disabled={!query.trim()}
        icon={<Symbol name="plus" color="primary" />} onPress={addEquipment} />} />
    {custom.length ? <View style={s.grid}>{custom.map(item => <ChoiceCard key={item} title={item} layout="chip" indicatorPosition="trailing" selected
      onPress={() => update({ equipment: profile.equipment.filter(value => value !== item) })} />)}</View> : null}
  </>;
}

const styles = StyleSheet.create({
  performanceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border },
  performanceValue: { flexDirection: 'row', alignItems: 'center' },
  unknown: { paddingHorizontal: 10, minHeight: 37, borderColor: colors.border, borderRadius: 12 }, unknownText: { fontSize: 11 },
  sportTitle: { fontSize: 13, lineHeight: 19 },
  sportOption: { minHeight: 55, gap: 8 },
  centeredTitle: { textAlign: 'center', fontSize: 12, lineHeight: 17 },
  placeCard: { padding: 9, minHeight: 139, alignItems: 'center' },
  availabilityCard: { padding: 14, gap: 8 },
  calendarHero: { height: 112 }, sessionStepper: { alignSelf: 'center', width: '70%', backgroundColor: 'transparent', paddingVertical: 0, minHeight: 46 },
  tabs: { minHeight: 38, backgroundColor: colors.primarySurface, borderRadius: 14 },
  gymCard: { padding: 9, borderRadius: 18, gap: 6 }, gymPhoto: { width: '100%', height: 90, borderRadius: 11 },
  gymTitle: { fontSize: 11, lineHeight: 16 }, gymDescription: { fontSize: 7, lineHeight: 12 },
  equipmentCard: { paddingHorizontal: 6, paddingVertical: 9, borderRadius: 16, gap: 5 },
  searchInput: { paddingLeft: 9, fontSize: 11 },
});
