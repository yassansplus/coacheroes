import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BodyPainSelector, type BodyPainSelection, type BodyPainSide } from '@/components/BodyPainSelector';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChoiceCard } from '@/components/ChoiceCard';
import { EmptyState } from '@/components/EmptyState';
import { Illustration } from '@/components/Illustration';
import { PillSelector } from '@/components/PillSelector';
import { TabSelector } from '@/components/TabSelector';
import { Symbol } from '@/components/Symbol';
import { TextField } from '@/components/TextField';
import { LineChart } from '@/components/charts/LineChart';
import { colors } from '@/theme/colors';
import { alternatives } from '../data';
import type { Exercise, PainReport } from '../types';
import { styles as s } from './styles';
import { StatTiles } from './SessionViews';

export function ReplaceExercise({ exercise, onConfirm, onCancel }: { exercise: Exercise; onConfirm: (exercise: Exercise) => void; onCancel: () => void }) {
  const [search, setSearch] = useState('');
  const [equipment, setEquipment] = useState('Tous');
  const [selected, setSelected] = useState<Exercise | null>(null);
  const choices = alternatives(exercise).filter(item => (equipment === 'Tous' || item.equipment === equipment) && item.name.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr')));
  return <View style={s.stack}>
    <Card style={s.row}><Illustration name={exercise.icon} size={74} /><View style={s.grow}><Text style={s.section}>{exercise.name}</Text><Text style={s.body}>{exercise.sets.filter(set => !set).length} × {exercise.minReps}–{exercise.maxReps}</Text></View></Card>
    <TextField accessibilityLabel="Rechercher un exercice" placeholder="Rechercher un exercice" value={search} onChangeText={setSearch} leftAccessory={<Symbol name="search" color="textMuted" />} />
    <PillSelector value={equipment} onChange={setEquipment} items={[{ value: 'Tous', label: 'Même muscle' }, { value: 'Machine', label: 'Machine' }, { value: 'Haltères', label: 'Haltères' }]} />
    <Text style={s.section}>Suggestions</Text>
    {choices.map(item => <ChoiceCard key={item.id} layout="row" role="radio" indicatorPosition="trailing" title={item.name} description={`${item.muscle} · ${item.equipment}`} icon={<Illustration name={item.icon} size={56} />} selected={selected?.id === item.id} onPress={() => setSelected(item)} />)}
    {!choices.length ? <EmptyState title="Aucun exercice trouvé" description="Essaie un autre nom ou change le filtre." /> : null}
    <Text style={s.caption}>Alternatives de démonstration. La charge du nouvel exercice est à renseigner, elle n’est pas transposée automatiquement.</Text>
    <Button text="Remplacer" disabled={!selected} onPress={() => selected && onConfirm(selected)} />
    <Button text="Annuler" variant="outline" onPress={onCancel} />
  </View>;
}

export function PainForm({ exerciseId, onSave, onCancel }: { exerciseId: string; onSave: (report: PainReport) => void; onCancel: () => void }) {
  const [zones, setZones] = useState<BodyPainSelection[]>([]);
  const [side, setSide] = useState<BodyPainSide>('left');
  const [intensity, setIntensity] = useState(3);
  const [timing, setTiming] = useState('Pendant la série');
  const [note, setNote] = useState('');
  return <View style={s.stack}>
    <Text style={s.section}>Où as-tu mal ?</Text>
    <BodyPainSelector value={zones} onChange={setZones} side={side} onSideChange={setSide} />
    <Text style={s.section}>Intensité</Text><PillSelector value={String(intensity)} onChange={value => setIntensity(Number(value))} items={[1, 2, 3, 4, 5].map(value => ({ value: String(value), label: String(value) }))} />
    <Text style={s.section}>Quand ressens-tu cette douleur ?</Text><PillSelector value={timing} onChange={setTiming} items={['Pendant la série', 'Après la série'].map(value => ({ value, label: value }))} />
    <TextField label="Précision facultative" placeholder="Ajoute un détail si besoin…" value={note} onChangeText={setNote} maxLength={200} multiline helperText={`${note.length} / 200`} />
    <Text style={s.caption}>Ce signalement reste local et ne constitue pas un avis médical.</Text>
    <Button text="Enregistrer et adapter" disabled={!zones.length} onPress={() => onSave({ exerciseId, zones, intensity, timing, note })} />
    <Button text="Annuler" variant="secondary" onPress={onCancel} />
  </View>;
}

export function ExerciseHistory({ exercise }: { exercise: Exercise }) {
  const [tab, setTab] = useState('sessions');
  const [expanded, setExpanded] = useState<number | null>(null);
  const logged = exercise.sets.filter(set => set && !set.warmup);
  const previous = exercise.previous;
  const labels = ['11 août', '18 août', '25 août', '1 sept.', '8 sept.', '15 sept.'];
  const history = previous.reps.length ? [0.75, 5 / 6, 0.875, 23 / 24, 1, 1].map((ratio, index) => ({ day: index, label: labels[index], value: Math.round(previous.weight * ratio * 2) / 2 })) : [];
  return <View style={s.stack}>
    <Text style={s.title}>{exercise.name}</Text>
    <TabSelector value={tab} onChange={setTab} items={[{ value: 'sessions', label: 'Séances' }, { value: 'progress', label: 'Progression' }]} />
    {previous.reps.length ? <StatTiles ribbon items={[{ label: 'Dernière charge', value: `${previous.weight} kg`, icon: 'dumbbell' }, { label: 'Meilleure série', value: `${previous.weight} × ${Math.max(...previous.reps)}`, icon: 'chart' }, { label: 'Volume', value: `${previous.weight * previous.reps.reduce((a, b) => a + b, 0)} kg`, icon: 'layers' }]} /> : null}
    <Card style={s.stack}><View style={s.row}><Text style={[s.section, s.grow]}>Charge de travail</Text><Text style={s.caption}>kg</Text></View><LineChart data={history} color={colors.accent} accessibilityLabel="Charge de travail sur six séances d’exemple, en kilogrammes" /></Card>
    {previous.reps.length && tab === 'sessions' ? <><Text style={s.section}>Dernières séances</Text>{[5, 4, 3].map((session, index) => <Card key={session} style={s.compact}><Pressable accessibilityRole="button" accessibilityLabel={`Détail du ${labels[session]}`} onPress={() => setExpanded(expanded === session ? null : session)} style={s.row}><View><Text style={s.label}>{labels[session]}</Text><Text style={s.body}>{history[session].value} kg</Text></View><View style={[s.row, s.grow, { gap: 5, justifyContent: 'center' }]}>{previous.reps.map((reps, i) => <View key={i} style={{ padding: 8, backgroundColor: [colors.primarySurface, colors.successSurface, colors.accentSurface][index], borderRadius: 7 }}><Text style={s.label}>{reps}</Text></View>)}</View><Symbol name="chevron" size={16} color="textMuted" /></Pressable>{expanded === session ? <Text style={s.body}>{previous.reps.length} séries · {history[session].value * previous.reps.reduce((a, b) => a + b, 0)} kg de volume</Text> : null}</Card>)}</> : !previous.reps.length ? <EmptyState title="Pas encore d’historique" description="Cet exercice vient d’être ajouté à ta séance." /> : null}
    {logged.length ? <Card style={s.stack}><Text style={s.section}>Cette séance</Text>{logged.map((set, index) => <Text key={index} style={s.body}>Série {index + 1} · {set!.weight} kg × {set!.reps} reps</Text>)}</Card> : null}
    <Text style={s.caption}>Historique de démonstration · sans données distantes</Text>
  </View>;
}
