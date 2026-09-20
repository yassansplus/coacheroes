import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Motion } from '@/components/Motion';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChoiceCard } from '@/components/ChoiceCard';
import { Illustration } from '@/components/Illustration';
import { NumberStepper } from '@/components/NumberStepper';
import { PillSelector } from '@/components/PillSelector';
import { ProgressBar } from '@/components/ProgressBar';
import { Toggle } from '@/components/Toggle';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { feelings } from '../data';
import type { Exercise, SetDraft } from '../types';
import { proposedWeight } from '../utils';
import { styles as s } from './styles';

export function SetDrawer({ draft, exercise, onClose, onSave }: {
  draft: SetDraft; exercise: Exercise; onClose: () => void; onSave: (draft: SetDraft, nextWeight?: number) => void;
}) {
  const [value, setValue] = useState(draft.value);
  const [step, setStep] = useState(1);
  const [adjust, setAdjust] = useState('apply');
  const saved = useRef(false);
  const save = (result: SetDraft, nextWeight?: number) => { if (saved.current) return; saved.current = true; onSave(result, nextWeight); };
  const suggestion = proposedWeight(value.weight);
  const needsAdjustment = !value.warmup && value.weight > 0 && suggestion < value.weight &&
    (value.feeling === 'hard' || value.feeling === 'failure') && value.reps < exercise.minReps &&
    exercise.sets.some((set, index) => index > draft.setIndex && !set);
  const next = () => { if (step === 1) setStep(2); else if (step === 2 && needsAdjustment) setStep(3); else save({ ...draft, value }, step === 3 && adjust === 'apply' ? suggestion : undefined); };
  return <BottomSheet visible onClose={onClose} style={{ maxHeight: '92%', backgroundColor: colors.onboardingBackground }}
    footer={<View style={s.stack}><Button disabled={step === 2 && !value.feeling} hapticFeedback text={step === 1 ? 'Valider la saisie' : step === 2 ? (needsAdjustment ? 'Continuer' : 'Enregistrer la série') : 'Confirmer et reprendre'} onPress={next} />
      <Button text={step === 1 ? 'Annuler' : 'Retour'} variant="secondary" onPress={step === 1 ? onClose : () => setStep(step - 1)} />
      {step === 2 ? <Button text="Enregistrer sans ressenti" variant="outline" onPress={() => save({ ...draft, value: { ...value, feeling: null } })} /> : null}</View>}>
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.stack}><Motion trigger={step} style={s.stack}>
      <Text style={s.caption}>{exercise.name} · Série {draft.setIndex + 1} · Étape {step}/3</Text>
      <ProgressBar progress={step / 3 * 100} height={3} />
      {step === 1 ? <>
        <Text style={s.title}>Saisir la série</Text>
        <View style={[s.row, { alignItems: 'stretch' }]}><Card style={[s.grow, { padding: 12, gap: 12 }]}><Text style={[s.body, s.center]}>Charge</Text>
          <NumberStepper layout="stacked" unit="kg" label="la charge" value={value.weight} onChange={weight => setValue({ ...value, weight })} step={2.5} maximum={500} formatValue={weight => weight.toLocaleString('fr-FR', { minimumFractionDigits: 1 })} /></Card>
          <Card style={[s.grow, { padding: 12, gap: 12 }]}><Text style={[s.body, s.center]}>Répétitions</Text><NumberStepper layout="stacked" label="les répétitions" value={value.reps} onChange={reps => setValue({ ...value, reps })} maximum={100} /></Card></View>
        <Text style={s.label}>Charges rapides</Text><PillSelector variant="filled" value={String(value.weight)} onChange={weight => setValue({ ...value, weight: Number(weight) })}
          items={[...new Set([-5, -2.5, 0, 2.5].map(offset => Math.max(0, Math.min(500, exercise.weight + offset))))].map(weight => ({ value: String(weight), label: `${weight.toLocaleString('fr-FR')} kg` }))} />
        <Card style={{ padding: 16 }}><Toggle label="Série d’échauffement" disabled={!!exercise.sets[draft.setIndex]} value={value.warmup} onValueChange={warmup => setValue({ ...value, warmup })} /></Card>
      </> : null}
      {step === 2 ? <>
        <Text style={s.title}>Comment était la série ?</Text><Card style={s.row}><Illustration name={exercise.icon} size={52} /><Text style={s.section}>{value.weight} kg × {value.reps} reps</Text></Card>
        {feelings.map((item, index) => <ChoiceCard key={item.value} layout="row" role="radio" indicatorPosition="trailing" icon={<Symbol name="chart" size={34} color={[colors.success, colors.primary, colors.warning, colors.energy][index]} />} title={item.title} description={item.description}
          selected={value.feeling === item.value} onPress={() => setValue({ ...value, feeling: item.value })} />)}
      </> : null}
      {step === 3 ? <>
        <Text style={s.title}>Charge proposée</Text><Card style={s.row}><Symbol name="chart" size={34} color="accent" /><View><Text style={s.section}>Série {draft.setIndex + 1} : {value.reps} reps</Text><Text style={s.body}>Ressenti {value.feeling === 'failure' ? 'échec' : 'difficile'}</Text></View></Card>
        <Card style={s.stack}><Text style={s.section}>Prochaine série</Text><View style={s.row}><Text style={[s.value, { textDecorationLine: 'line-through', color: colors.textMuted }]}>{value.weight}</Text><Symbol name="arrow" color="textMuted" /><Text style={[s.value, { color: colors.primary }]}>{suggestion} kg</Text></View>
          <Text style={s.body}>Objectif : {exercise.minReps}–{exercise.maxReps} reps · Repos {Math.floor(exercise.restSeconds / 60)} min</Text></Card>
        <ChoiceCard layout="row" role="radio" title={`Appliquer ${suggestion} kg`} selected={adjust === 'apply'} onPress={() => setAdjust('apply')} />
        <ChoiceCard layout="row" role="radio" title={`Garder ${exercise.weight} kg`} selected={adjust === 'keep'} onPress={() => setAdjust('keep')} />
        <Text style={s.caption}>Suggestion de démonstration, à confirmer par toi.</Text>
      </> : null}
    </Motion></ScrollView>
  </BottomSheet>;
}
