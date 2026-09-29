import { Text } from '@/components/LocalizedText';
import { localizeLabel } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { BodyPainSelector, type BodyPainSelection } from '@/components/BodyPainSelector';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChoiceCard } from '@/components/ChoiceCard';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingState } from '@/components/LoadingState';
import { NumberStepper } from '@/components/NumberStepper';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { WeekdaySelector } from '@/components/WeekdaySelector';
import { useSession } from '@/providers/SessionProvider';
import { useTrainingProgramState } from '@/providers/TrainingProgramProvider';
import { loadProgramBlock, renewTrainingProgram, type BlockReview, type RenewalAnswers } from '@/services/trainingProgram';
import { extendBlock, syncWorkouts } from '@/services/workouts';
import { readWorkouts } from '@/storage/workouts';
import { colors } from '@/theme/colors';
import { BlockSummary } from '../components/BlockSummary';
import { styles as s } from '../components/styles';

const goals: { value: RenewalAnswers['goals'][number]; label: string }[] = [
  { value: 'fat-loss', label: 'Perdre du gras' }, { value: 'muscle', label: 'Prendre du muscle' },
  { value: 'recomposition', label: 'Recomposition' }, { value: 'performance', label: 'Performance' },
];
const sports = [
  ['strength', 'Musculation'], ['running', 'Course'], ['cycling', 'Vélo'], ['swimming', 'Natation'], ['walking', 'Marche'],
  ['yoga', 'Yoga'], ['pilates', 'Pilates'], ['football', 'Football'], ['basketball', 'Basket'], ['tennis', 'Tennis'],
  ['padel', 'Padel'], ['boxing', 'Boxe'], ['crossfit', 'Cross-training'],
] as const;
const equipmentOptions = [
  ['dumbbells', 'Haltères'], ['barbell', 'Barre'], ['machines', 'Machines'], ['cables', 'Poulies'],
  ['bag', 'Sac de frappe'], ['bodyweight', 'Poids du corps'], ['bench', 'Banc'], ['pull-up bar', 'Barre de traction'],
] as const;
const toggle = <T,>(values: T[], value: T) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];

export function ProgramRenewalScreen({ blockId, onBack, onDone }: { blockId: string; onBack: () => void; onDone: () => void }) {
  useLanguage();
  const { user } = useSession();
  const program = useTrainingProgramState();
  const [review, setReview] = useState<BlockReview | null>(null);
  const [answers, setAnswers] = useState<RenewalAnswers | null>(null);
  const [stage, setStage] = useState<'summary' | 'questions'>('summary');
  const [painSide, setPainSide] = useState<'left' | 'right'>('right');
  const [weightText, setWeightText] = useState('');
  const [equipmentText, setEquipmentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef<string | null>(null);
  const load = async () => { setError(null); try { const data = await loadProgramBlock(blockId); setReview(data); setAnswers(data.answers);
    setWeightText(data.answers.weightKg === null ? '' : String(data.answers.weightKg));
    setEquipmentText(data.answers.equipment.filter(item => !equipmentOptions.some(option => option[0] === item)).join(', '));
  } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger le bilan.'); } };
  useEffect(() => { void load(); }, [blockId]);
  const update = (patch: Partial<RenewalAnswers>) => { setAnswers(current => current ? { ...current, ...patch } : current); setError(null); requestId.current = null; };
  const schedule = (sport: string, patch: Partial<RenewalAnswers['schedules'][number]>) => {
    if (!answers) return;
    const existing = answers.schedules.find(item => item.sport === sport) ?? { sport, mode: 'coach' as const, weekdays: [], minutes: null };
    update({ schedules: [...answers.schedules.filter(item => item.sport !== sport), { ...existing, ...patch }] });
  };
  const submit = async () => {
    if (!review || !answers || busy) return;
    const weightKg = weightText.trim() ? Number(weightText.replace(',', '.')) : null;
    const next = { ...answers, weightKg, equipment: [...new Set([...answers.equipment.filter(item => equipmentOptions.some(option => option[0] === item)),
      ...equipmentText.split(',').map(value => value.trim()).filter(Boolean)])],
      schedules: answers.schedules.filter(item => answers.sports.includes(item.sport)) };
    if (!next.goals.length || !next.days.length || next.sessions > next.days.length || !next.places.some(place => place === 'gym' || place === 'home') || !next.sports.includes('strength')) {
      setError('Vérifie tes objectifs, tes lieux et tes disponibilités.'); return;
    }
    if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 30 || weightKg > 350)) { setError('Vérifie ton poids actuel.'); return; }
    if (!next.noPain && !next.painNotes.trim()) { setError('Indique les mouvements qui te gênent.'); return; }
    if (next.schedules.some(item => item.mode === 'fixed' && (!item.weekdays.length || !item.minutes || item.weekdays.some(day => !next.days.includes(day))))) {
      setError('Vérifie les jours et la durée de tes cours fixes.'); return;
    }
    setBusy(true); setError(null);
    try {
      if (user) {
        await syncWorkouts(user.id);
        const cache = await readWorkouts(user.id);
        if (Object.values(cache.sessions).some(item => item.snapshot.workout.programVersionId === blockId && item.pending.length))
          throw new Error('Une séance attend encore sa synchronisation. Réessaie quand elle sera enregistrée.');
      }
      requestId.current ??= Crypto.randomUUID();
      await renewTrainingProgram(blockId, review.profileRevision, requestId.current, next);
      await program.refresh(); onDone();
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de préparer le prochain programme.'); }
    finally { setBusy(false); }
  };
  const extend = async () => { if (busy) return; setBusy(true); setError(null); try { await extendBlock(blockId); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossible de prolonger le programme.'); } finally { setBusy(false); } };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><View style={{ flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18 }}>
    <AppHeader title="Bilan du programme" leading={<IconButton accessibilityLabel={localizeLabel("Retour")} icon={<Symbol name="back" />} onPress={() => stage === 'questions' ? setStage('summary') : onBack()} />} />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16, paddingVertical: 16, paddingBottom: 46 }}>
      {!review && !error ? <LoadingState label="On rassemble tes séances" /> : null}
      {error && !review ? <ErrorState title="Bilan indisponible" description={error} onRetry={() => void load()} /> : null}
      {review && stage === 'summary' ? <>
        <Text style={s.title}>Regarde le chemin parcouru</Text>
        <Text style={s.body}>Voici les séances et mesures que tu as enregistrées sur ce bloc.</Text>
        <BlockSummary summary={review.summary} />
        {error ? <Text style={{ color: colors.energy }}>{error}</Text> : null}
        {review.summary.due ? <><Button text="Préparer la suite" onPress={() => { setStage('questions'); setError(null); }} />
          <Button text={busy ? 'Prolongation…' : 'Continuer deux semaines'} variant="outline" disabled={busy} onPress={() => void extend()} /></> : null}
      </> : null}
      {review && answers && stage === 'questions' ? <>
        <Text style={s.title}>On prépare la suite ?</Text>
        <Text style={s.body}>Tes réponses sont déjà remplies. Change seulement ce qui a bougé.</Text>
        <Card style={s.stack}><Text style={s.section}>Ton objectif</Text>
          {goals.map(goal => <ChoiceCard key={goal.value} title={goal.label} selected={answers.goals.includes(goal.value)} layout="row" indicatorPosition="trailing"
            onPress={() => update({ goals: toggle(answers.goals, goal.value) })} />)}</Card>
        <Card style={s.stack}><Text style={s.section}>Tes sports</Text><View style={s.wrap}>
          {sports.map(([value, label]) => <ChoiceCard key={value} title={label} selected={answers.sports.includes(value)} layout="chip" indicatorPosition="trailing" disabled={value === 'strength'}
            style={{ minWidth: '43%', flexGrow: 1 }} onPress={() => update({ sports: toggle(answers.sports, value) })} />)}
        </View></Card>
        <Card style={s.stack}><Text style={s.section}>Tes disponibilités</Text><WeekdaySelector value={answers.days} onChange={days => update({ days })} />
          <NumberStepper label="séances par semaine" value={answers.sessions} onChange={sessions => update({ sessions })} minimum={1} maximum={7} />
          <TabSelector value={answers.duration} onChange={duration => update({ duration: duration as RenewalAnswers['duration'] })}
            items={[{ value: '45', label: '45 min' }, { value: '60', label: '60 min' }, { value: '90', label: '90 min' }]} />
          <TabSelector value={answers.timeOfDay} onChange={timeOfDay => update({ timeOfDay: timeOfDay as RenewalAnswers['timeOfDay'] })}
            items={[{ value: 'morning', label: 'Matin' }, { value: 'noon', label: 'Midi' }, { value: 'evening', label: 'Soir' }]} />
        </Card>
        {answers.sports.filter(sport => sport !== 'strength').map(sport => { const item = answers.schedules.find(value => value.sport === sport);
          return <Card key={sport} style={s.stack}><Text style={s.section}>{sports.find(value => value[0] === sport)?.[1] ?? sport}</Text>
            <TabSelector value={item?.mode ?? 'coach'} onChange={mode => schedule(sport, { mode: mode as 'coach' | 'fixed' })}
              items={[{ value: 'coach', label: 'Le coach organise' }, { value: 'fixed', label: 'Cours fixe' }]} />
            {item?.mode === 'fixed' ? <><Text style={s.body}>Quels jours ?</Text><WeekdaySelector value={item.weekdays} onChange={weekdays => schedule(sport, { weekdays })} />
              <NumberStepper label="minutes du cours" value={item.minutes ?? 60} onChange={minutes => schedule(sport, { minutes })} minimum={15} maximum={90} step={5} /></> : null}
          </Card>; })}
        <Card style={s.stack}><Text style={s.section}>Lieu et matériel</Text><View style={s.wrap}>
          {([['gym', 'Salle'], ['home', 'Maison'], ['club', 'Club']] as const).map(([value, label]) => <ChoiceCard key={value} title={label}
            selected={answers.places.includes(value)} layout="chip" indicatorPosition="trailing" style={{ flex: 1 }} onPress={() => {
              const places = toggle(answers.places, value);
              update({ places, gymType: places.includes('gym') ? answers.gymType : 'home' });
            }} />)}
        </View><TabSelector value={answers.gymType ?? 'full'} onChange={gymType => update({ gymType: gymType as RenewalAnswers['gymType'] })}
          items={[{ value: 'full', label: 'Salle complète' }, { value: 'building', label: 'Petite salle' }, { value: 'home', label: 'Maison' }]} />
          <Text style={s.label}>Équipement disponible</Text><View style={s.wrap}>
            {equipmentOptions.map(([value, label]) => <ChoiceCard key={value} title={label} selected={answers.equipment.includes(value)} layout="chip"
              indicatorPosition="trailing" style={{ minWidth: '43%', flexGrow: 1 }} onPress={() => update({ equipment: toggle(answers.equipment, value) })} />)}
          </View>
          <TextField label="Autre matériel" value={equipmentText} onChangeText={value => { setEquipmentText(value); requestId.current = null; setError(null); }} placeholder={localizeLabel("Ex. : kettlebell")} helperText="Sépare les éléments par une virgule." />
        </Card>
        <Card style={s.stack}><Text style={s.section}>Douleurs actuelles</Text>
          <ChoiceCard title="Aucune douleur actuellement" selected={answers.noPain} layout="row" onPress={() => update({ noPain: true, pains: [], painNotes: '' })} />
          <ChoiceCard title="J’ai une gêne ou une douleur" selected={!answers.noPain} layout="row" onPress={() => update({ noPain: false })} />
          {!answers.noPain ? <><BodyPainSelector value={answers.pains as BodyPainSelection[]} onChange={pains => update({ pains })} side={painSide} onSideChange={setPainSide} />
            <TextField label="Quels mouvements te gênent ?" value={answers.painNotes} onChangeText={painNotes => update({ painNotes })} multiline maxLength={200} /></> : null}
        </Card>
        <Card style={s.stack}><Text style={s.section}>Ton ressenti</Text>
          <TabSelector value={answers.effort} onChange={effort => update({ effort: effort as RenewalAnswers['effort'] })}
            items={[{ value: 'easy', label: 'Trop facile' }, { value: 'balanced', label: 'Bien dosé' }, { value: 'hard', label: 'Trop dur' }]} />
          <TextField label="Tu veux garder ou changer quelque chose ?" value={answers.feedback} onChangeText={feedback => update({ feedback })} multiline maxLength={500} placeholder={localizeLabel("Facultatif")} />
          <TextField label="Ton poids actuel, si tu le connais" value={weightText} onChangeText={value => { setWeightText(value); requestId.current = null; setError(null); }} keyboardType="decimal-pad" placeholder={localizeLabel("kg")} />
        </Card>
        {error ? <Text style={{ color: colors.energy }}>{error}</Text> : null}
        <Button text={busy ? 'Préparation…' : 'Générer mon prochain programme'} disabled={busy} onPress={() => void submit()} />
      </> : null}
    </ScrollView>
  </View></SafeAreaView>;
}
