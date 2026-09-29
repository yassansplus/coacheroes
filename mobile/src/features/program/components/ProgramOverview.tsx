import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { localizeLabel } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import {blockProgress, syncWorkouts, type BlockProgress} from '@/services/workouts';
import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Calendar } from '@/components/Calendar';
import { Card } from '@/components/Card';
import { CardHighlight } from '@/components/CardHighlight';
import { EmptyState } from '@/components/EmptyState';
import { DropdownMenu } from '@/components/DropdownMenu';
import { IconButton } from '@/components/IconButton';
import { Illustration } from '@/components/Illustration';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { colors } from '@/theme/colors';
import { activeProgramAdjustment, setProgramAdjustment, useProgramAdjustment } from '@/store/programAdjustment';
import { AppModal } from '@/components/AppModal';
import { workouts } from '../data';
import { generatedWorkout } from '../generatedAdapter';
import { loadProgramBlock, renewTrainingProgram, type TrainingProgram } from '@/services/trainingProgram';
import { useSession } from '@/providers/SessionProvider';
import { useTrainingProgramState } from '@/providers/TrainingProgramProvider';
import { readWorkouts } from '@/storage/workouts';
import { getSessionToken } from '@/storage/session';
import type { Workout } from '../types';
import { styles as s } from './styles';

const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function ProgramOverview({ onSelect, program, onBlockReview, onHistory }: { onSelect: (workout: Workout) => void; program?: TrainingProgram; onBlockReview?: (id: string) => void; onHistory?: () => void }) {
  useLanguage();
  const { user } = useSession();
  const trainingProgram = useTrainingProgramState();
  const [menuVisible, setMenuVisible] = useState(false);
  const [regenerateVisible, setRegenerateVisible] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState<string | null>(null);
  const regenerationRequestId = useRef<string | null>(null);
  const regenerationBusy = useRef(false);
  const regenerate = async () => {
    if (!program?.acceptedAt || !user || regenerationBusy.current) return;
    regenerationBusy.current = true;
    setRegenerating(true); setRegenerationError(null);
    const token = getSessionToken();
    try {
      await syncWorkouts(user.id);
      const cache = await readWorkouts(user.id);
      const sessions = Object.values(cache.sessions).filter(item => item.snapshot.workout.programVersionId === program.proposalId);
      if (sessions.some(item => item.snapshot.status === 'in_progress'))
        throw new Error('Termine ou arrête ta séance en cours avant de créer un nouveau programme.');
      if (sessions.some(item => item.pending.length))
        throw new Error('Une séance attend encore sa synchronisation. Réessaie quand elle sera enregistrée.');
      const review = await loadProgramBlock(program.proposalId);
      if (token !== getSessionToken()) return;
      regenerationRequestId.current ??= Crypto.randomUUID();
      await renewTrainingProgram(program.proposalId, review.profileRevision, regenerationRequestId.current, review.answers, true);
      setRegenerateVisible(false);
      await trainingProgram.refresh();
    } catch (error) {
      if (token === getSessionToken()) {
        setRegenerationError(error instanceof Error ? error.message : 'Impossible de créer ton nouveau programme.');
        void trainingProgram.refresh();
      }
    } finally { regenerationBusy.current = false; setRegenerating(false); }
  };
  const [block,setBlock]=useState<BlockProgress|null>(null);
  const [blockError,setBlockError]=useState<string|null>(null);
  useEffect(() => {
    if (!program?.acceptedAt) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try {
        const next = await blockProgress(program.proposalId);
        if (!active) return;
        setBlock(next); setBlockError(null);
        if (!next.due) timer = setTimeout(() => void refresh(), Math.min(86400000, Math.max(1000, Date.parse(next.endsAt) - Date.now() + 1000)));
      } catch (error) { if (active) setBlockError(error instanceof Error ? error.message : 'Bilan indisponible.'); }
    };
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [program?.proposalId, program?.acceptedAt]);
  const savedAdjustment = useProgramAdjustment();
  const adjustment = program ? null : activeProgramAdjustment(savedAdjustment);
  const schedule = program ? (program.result?.sessions ?? []).map((_, i) => generatedWorkout(program, i)).filter((w): w is Workout => w !== null) : workouts;
  const blockWeeks = block?.weeks ?? program?.result?.blockWeeks ?? 4;
  const currentWeek = block?.currentWeek ?? (program?.acceptedAt ? Math.min(blockWeeks, Math.max(1, Math.floor((Date.now() - new Date(program.acceptedAt).getTime()) / 604800000) + 1)) : 2);
  const [resetVisible, setResetVisible] = useState(false);
  const [tab, setTab] = useState('sessions');
  const [date, setDate] = useState(new Date());
  const [weeksVisible, setWeeksVisible] = useState(false);
  const [week, setWeek] = useState(currentWeek);
  useEffect(()=>{if(block)setWeek(block.currentWeek);},[block?.currentWeek]);
  const dateKey=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const occurrence=(item:Workout)=>block?.occurrences.find(o=>o.sessionIndex===item.sessionIndex&&(tab==='calendar'?o.date===dateKey:o.week===week));
  const visibleWorkouts = tab === 'calendar' ? schedule.filter(item => block ? !!occurrence(item) : item.day === date.getDay()) : schedule;
  return <View style={{ gap: 10 }}>
    <View style={s.row}><Text style={[s.title, s.grow]}>Mon programme</Text><IconButton accessibilityLabel={localizeLabel('Options du programme')} icon={<Symbol name="settings" />} onPress={() => setMenuVisible(value => !value)} /></View>
    {block?.due && program ? <Card style={s.stack}><Text style={s.section}>Ton bloc est terminé 🎉</Text><Text style={s.body}>Regarde ton évolution, puis prépare la suite avec ton coach.</Text>
      <Button text="Voir mon bilan et préparer la suite" leading={<Symbol name="calendar" />} onPress={() => onBlockReview?.(program.proposalId)} /></Card> : null}
    {adjustment ? <Card style={{ padding: 16, gap: 10 }}><Text style={s.section}>Muscu B allégée</Text><Text style={s.body}>14 séries · 50 min · RIR 3{adjustment.scope === 'week' ? ' · cette semaine' : ' · jusqu’à nouvel ordre'}</Text><Button text="Rétablir le programme initial" variant="outline" onPress={() => setResetVisible(true)} /></Card> : null}
    <Card style={{ gap: 12, padding: 14 }}>
      <View style={s.row}><View style={s.grow}><Text style={s.section}>{program?.result?.title ?? 'Phase 1 · Reprise'}</Text><Text style={[s.body, { marginTop: 4 }]}>Semaines 1 à {blockWeeks}</Text></View><Illustration name="calendar" size={54} /></View>
      <View style={{ gap: 7 }}><Text style={s.label}>Semaine {currentWeek} sur {blockWeeks}</Text><ProgressBar progress={currentWeek / blockWeeks * 100} height={12} /></View>
    </Card>
    <TabSelector value={tab} onChange={setTab} items={[{ value: 'sessions', label: 'Séances' }, { value: 'calendar', label: 'Calendrier' }]} />
    {tab === 'calendar' ? <Calendar selectedDate={date} onSelectDate={setDate} /> : null}
    <Text style={s.section}>{week === currentWeek ? 'Mes séances' : t("Mes séances · semaine {p0}", { p0: week })}</Text>
    <View style={{ gap: 10 }}>
      {visibleWorkouts.map(original => { const item = adjustment?.workoutId === original.id ? { ...original, minutes: adjustment.minutes } : original; return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={localizeLabel(t("Ouvrir {p0}, {p1}", { p0: item.name, p1: days[item.day] }))} accessibilityState={{ disabled: Boolean(block?.due) }} disabled={Boolean(block?.due)} onPress={() => onSelect({...original,week:occurrence(original)?.week??week,scheduledDate:occurrence(original)?.date})} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Card style={[s.row, { padding: 7, gap: 12 }]}>
          <View style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: item.kind === 'strength' ? colors.primarySurface : colors.energySurface }}><Illustration name={item.icon} size={60} /></View>
          <View style={[s.grow, { gap: 2 }]}><Text style={[s.section, { fontSize: 16, lineHeight: 22 }]}>{item.name}</Text><Text style={[s.body, { fontSize: 11, lineHeight: 16 }]}>{item.kind === 'strength' ? program ? t("{p0} exercices", { p0: item.prescribedExercises?.length ?? 0 }) : t("{p0} · {p1} exercices", { p0: item.description, p1: adjustment?.workoutId === item.id ? 7 : 8 }) : t("{p0} min", { p0: item.minutes })}</Text>
            <View style={[s.wrap, { gap: 5, marginTop: 2 }]}>
              {item.kind === 'strength' ? <CardHighlight icon={<Symbol name="clock" size={13} color="success" />} title={t("{p0} min", { p0: item.minutes })} color={colors.successText} backgroundColor="successSurface" style={s.chip} /> : null}
              <CardHighlight icon={<Symbol name="calendar" size={13} color="accent" />} title={`${days[item.day]}${occurrence(item)?.status==='completed'?' · faite':occurrence(item)?.status==='missed'?' · manquée':''}`} color={colors.accent} backgroundColor="accentSurface" style={s.chip} />
            </View>
          </View><Symbol name="chevron" size={18} color="textMuted" />
        </Card>
      </Pressable>; })}
    </View>
    {!visibleWorkouts.length ? <EmptyState title="Journée de récupération" description="Pas de séance prévue à cette date." /> : null}
    {blockError ? <Text style={s.body}>{blockError}</Text> : null}
    <BottomSheet visible={weeksVisible} onClose={() => setWeeksVisible(false)} title="Toutes les semaines">
      <View style={s.stack}>{Array.from({ length: blockWeeks }, (_, i) => i + 1).map(value => <Button key={value} text={t("Semaine {p0}{p1}", { p0: value, p1: value === currentWeek ? ' · actuelle' : '' })} variant={week === value ? 'primary' : 'secondary'} onPress={() => { setWeek(value); setWeeksVisible(false); }} />)}</View>
    </BottomSheet>
    <AppModal visible={resetVisible} onClose={() => setResetVisible(false)} title="Rétablir Muscu B ?"><Text style={s.body}>La prochaine séance retrouvera ses 18 séries, 65 minutes et 2 répétitions en réserve.</Text><View style={{ gap: 10, marginTop: 16 }}><Button text="Rétablir" onPress={() => {setProgramAdjustment(null);setResetVisible(false);}} /><Button text="Annuler" variant="outline" onPress={() => setResetVisible(false)} /></View></AppModal>
    <AppModal visible={regenerateVisible} onClose={() => { if (!regenerating) setRegenerateVisible(false); }} title="Remplacer ton programme ?">
      <Text style={s.body}>Ton programme actuel sera marqué terminé, même si tu n’as pas fait toutes les séances. Ton historique reste conservé et ton coach prépare la suite.</Text>
      {regenerationError ? <Text style={[s.body, { color: colors.energy, marginTop: 10 }]}>{regenerationError}</Text> : null}
      <View style={{ gap: 10, marginTop: 16 }}><Button text={regenerating ? 'Préparation…' : 'Remplacer et créer'} disabled={regenerating} hapticFeedback onPress={() => void regenerate()} /><Button text="Garder mon programme" variant="outline" disabled={regenerating} onPress={() => setRegenerateVisible(false)} /></View>
    </AppModal>
    <DropdownMenu visible={menuVisible} onClose={() => setMenuVisible(false)} items={[
      { label: 'Toutes les semaines', onPress: () => setWeeksVisible(true) },
      ...(program && onHistory ? [{ label: 'Historique des programmes', onPress: onHistory }] : []),
      ...(program?.acceptedAt ? [{ label: 'Créer un nouveau programme', onPress: () => { setRegenerationError(null); setRegenerateVisible(true); } }] : []),
    ]} />
  </View>;
}
