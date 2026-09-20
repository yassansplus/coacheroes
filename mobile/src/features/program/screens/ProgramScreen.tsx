import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/AppHeader';
import { AppModal } from '@/components/AppModal';
import { Toast } from '@/components/Toast';
import { Motion } from '@/components/Motion';
import { AppNavbar } from '@/components/AppNavbar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DropdownMenu } from '@/components/DropdownMenu';
import { IconButton } from '@/components/IconButton';
import { Illustration } from '@/components/Illustration';
import { ProgressRing } from '@/components/ProgressRing';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { Toggle } from '@/components/Toggle';
import { colors } from '@/theme/colors';
import { ExerciseHistory, PainForm, ReplaceExercise } from '../components/ExerciseTools';
import { ProgramOverview } from '../components/ProgramOverview';
import { CoachAnalysis, Glyph, SessionDebrief, SessionDetail, SessionReady, SessionSummary, SessionTraining } from '../components/SessionViews';
import { SetDrawer } from '../components/SetDrawer';
import { styles as s } from '../components/styles';
import { useProgram } from '../hooks/useProgram';
import type { Exercise, Page } from '../types';
import { clockLabel } from '../utils';

const titles: Record<Page, string> = { program: '', detail: '', ready: '', warmup: 'Échauffement', training: '', rest: 'Temps de repos', replace: 'Remplacer l’exercice', pain: 'Signaler une douleur', history: 'Historique', debrief: 'Fin de séance', summary: 'Résumé de la séance', coach: '' };

export function ProgramScreen({ onHome, onToday, onProgress, onCoach, onProfile, initialPreparation = false }: { onHome: () => void; onToday: () => void; onProgress: () => void; onCoach: () => void; onProfile: () => void; initialPreparation?: boolean }) {
  const p = useProgram(initialPreparation ? 'ready' : 'program');
  const { width } = useWindowDimensions();
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [quit, setQuit] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const current = p.current;
  const pendingIndex = current?.sets.findIndex(set => !set) ?? -1;
  const totalSets = p.exercises.reduce((sum, item) => sum + item.sets.filter(set => !set?.warmup).length, 0);
  const back = () => {
    if (menu) { setMenu(false); return; }
    if (p.draft) { p.setDraft(null); return; }
    if (notice) { setNotice(null); return; }
    if (['replace', 'pain', 'history'].includes(p.page)) { p.setPage(p.returnPage); return; }
    if (p.page === 'detail') { setEditing(false); p.setPage('program'); return; }
    if (p.page === 'ready') { p.setPage('detail'); return; }
    if (p.page === 'coach') { p.setPage('summary'); return; }
    if (['training', 'rest', 'warmup', 'debrief'].includes(p.page)) { setQuit(true); return; }
    onHome();
  };
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); setMenu(false); }, [p.page, p.exerciseIndex]);
  useEffect(() => { const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; }); return () => subscription.remove(); });
  const history = (exercise: Exercise) => { if (p.page === 'summary') p.setRewardPlayed(true); p.openHistory(exercise); };
  let body: ReactNode = null;
  let footer: ReactNode = null;

  if (p.page === 'program') {
    body = <ProgramOverview onSelect={workout => { setShowAll(false); setEditing(false); p.selectWorkout(workout); }} />;
  } else if (p.page === 'detail') {
    body = <><SessionDetail p={p} editing={editing} showAll={showAll} onHistory={history} />
      {p.exercises.length > 6 ? <Button text={showAll ? 'Réduire la liste' : `${p.exercises.length - 6} exercices supplémentaires`} leading={<Symbol name={showAll ? 'minus' : 'plus'} color="primary" />} trailing={<Symbol name="chevron" color="textMuted" />} variant="secondary" onPress={() => setShowAll(!showAll)} /> : null}</>;
    footer = <View style={{ gap: 8 }}><Button text="Commencer la séance" hapticFeedback onPress={() => p.setPage('ready')} />{p.exercises.length ? <Button text={editing ? 'Terminer les modifications' : 'Modifier la séance'} variant="secondary" backgroundColor="transparent" textColor={colors.primary} onPress={() => { setEditing(!editing); setShowAll(true); }} /> : null}</View>;
  } else if (p.page === 'ready') {
    body = <SessionReady p={p} totalSets={totalSets} />;
    footer = <View style={{ gap: 6 }}><Button text="Démarrer" hapticFeedback onPress={p.start} /><Button text="Retour au programme" variant="secondary" backgroundColor="transparent" textColor={colors.primary} onPress={() => p.setPage('program')} /></View>;
  } else if (p.page === 'warmup' || p.page === 'rest') {
    const warmup = p.page === 'warmup';
    body = <>
      <Text style={[s.title, s.center]}>{warmup ? 'Échauffement' : 'Repos'}</Text>
      <ProgressRing animated animationDuration={950} progress={p.secondsLeft / p.timerDuration * 100} size={Math.min(width - 70, 290)} strokeWidth={13}><Text style={[s.value, { fontSize: 46 }]}>{clockLabel(p.secondsLeft)}</Text><Text style={s.section}>sur {clockLabel(p.timerDuration)}</Text></ProgressRing>
      {warmup ? <Card style={s.stack}><Text style={s.section}>{p.secondsLeft > 180 ? '1. Mise en mouvement' : p.secondsLeft > 60 ? '2. Mobilité douce' : '3. Préparation spécifique'}</Text><Text style={s.body}>{p.secondsLeft > 180 ? 'Marche ou mouvement léger à ton rythme.' : p.secondsLeft > 60 ? 'Mobilise doucement les articulations sollicitées.' : 'Répète les premiers mouvements sans charge.'}</Text></Card> : <>
        <View style={s.row}>{[-15, 15, 30].map(delta => <Button key={delta} text={`${delta > 0 ? '+' : '−'}${Math.abs(delta)} s`} variant="secondary" textColor={colors.primary} style={s.grow} onPress={() => p.adjustTimer(delta)} />)}</View>
        {current ? <Card style={s.stack}><Text style={s.caption}>PROCHAINE SÉRIE</Text><Text style={s.section}>{current.name} · Série {pendingIndex + 1}</Text><View style={s.row}><Illustration name={current.icon} size={55} /><View><Text style={s.value}>{current.weight} kg</Text><Text style={s.body}>Objectif {current.targetReps} reps</Text></View></View></Card> : null}
      </>}
      <Card style={[s.row, s.compact]}><Glyph name="clock" index={3} /><View style={s.grow}><Toggle label="Vibration en fin de repos" value={p.restHaptics} onValueChange={p.setRestHaptics} /></View></Card>
    </>;
    footer = <Button variant="outline" text={warmup ? 'Passer à la séance' : 'Reprendre maintenant'} hapticFeedback onPress={p.skipTimer} />;
  } else if (p.page === 'training') {
    body = <SessionTraining p={p} />;
    footer = <Button text={current ? `Saisir la série ${pendingIndex + 1}` : 'Terminer ma séance'} trailing={<Symbol name="arrow" color="white" />} hapticFeedback onPress={current ? () => p.openSet(pendingIndex) : p.finishFree} />;
  } else if (p.page === 'replace' && current) {
    body = <ReplaceExercise key={current.id} exercise={current} onConfirm={p.replaceExercise} onCancel={back} />;
  } else if (p.page === 'pain') {
    body = <PainForm exerciseId={current?.id ?? p.workout.id} onSave={p.savePain} onCancel={back} />;
  } else if (p.page === 'history' && p.historyExercise) {
    body = <ExerciseHistory key={p.historyExercise.id} exercise={p.historyExercise} />;
    footer = <Button text={p.returnPage === 'summary' ? 'Retour au résumé' : 'Retour à la séance'} trailing={<Symbol name="chevron" color="white" />} onPress={() => p.setPage(p.returnPage)} />;
  } else if (p.page === 'debrief') {
    body = <SessionDebrief p={p} />;
    footer = <Button text="Terminer la séance" trailing={<Symbol name="arrow" color="white" />} hapticFeedback="medium" onPress={() => p.setPage('summary')} />;
  } else if (p.page === 'summary') {
    body = <SessionSummary p={p} onHistory={history} />;
    footer = <View style={{ gap: 8 }}><Button text="Retour à l’accueil" onPress={onHome} /><Button text="Demander l’analyse du coach" variant="outline" onPress={() => { p.setRewardPlayed(true); p.setPage('coach'); }} /></View>;
  } else if (p.page === 'coach') {
    body = <CoachAnalysis p={p} />;
    footer = <View style={{ gap: 8 }}>{p.exercises.length ? <Button text={p.coachApplied ? 'Modifications appliquées' : 'Appliquer les modifications'} disabled={p.coachApplied} onPress={p.applyCoach} /> : null}<Button text="Voir mon programme" variant="outline" onPress={() => p.setPage('program')} /><Button text="Retour à l’accueil" variant="secondary" backgroundColor="transparent" onPress={onHome} /></View>;
  }

  return <View style={local.screen}><ScreenBackdrop /><SafeAreaView style={local.safe}>
    <KeyboardAvoidingView style={local.safe} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={local.frame}>
        {p.page !== 'program' ? <AppHeader style={{ minHeight: 54 }} title={['detail', 'ready', 'training'].includes(p.page) ? p.workout.name : titles[p.page]} leading={<IconButton accessibilityLabel="Retour" icon={<Symbol name={['ready', 'training', 'rest', 'debrief', 'summary', 'coach', 'pain', 'replace'].includes(p.page) ? 'close' : 'back'} />} onPress={back} />} trailing={p.page === 'training' && current ? <IconButton accessibilityLabel="Options de l’exercice" icon={<Symbol name="more" />} onPress={() => setMenu(!menu)} /> : p.page === 'detail' && p.exercises.length ? <IconButton accessibilityLabel="Modifier la séance" icon={<Symbol name="more" />} onPress={() => { setEditing(!editing); setShowAll(true); }} /> : p.page === 'rest' ? <Button text="Passer" variant="secondary" onPress={p.skipTimer} /> : undefined} /> : null}
        <ScrollView ref={scroll} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[local.content, p.page === 'program' && { gap: 10 }]}><Motion trigger={`${p.page}-${p.exerciseIndex}`} style={{ gap: p.page === 'program' ? 10 : 14 }}>{body}</Motion></ScrollView>
        {footer ? <View style={local.footer}>{footer}</View> : null}
        {p.page === 'program' ? <AppNavbar includeCoach value="program" style={{ marginBottom: 5 }} onChange={value => {
          if (value === 'today') onToday();
          else if (value === 'progress') onProgress();
          else if (value === 'coach') onCoach();
          else if (value === 'profile') onProfile();
        }} /> : null}
        <DropdownMenu visible={menu} onClose={() => setMenu(false)} items={[{ label: 'Remplacer l’exercice', onPress: () => p.editExercise(p.exerciseIndex) }, { label: 'Signaler une douleur', onPress: p.openPain }, { label: 'Historique de l’exercice', onPress: () => history(current) }]} />
      </View>
    </KeyboardAvoidingView>
    <Toast visible={!!p.notice} message={p.notice?.text ?? ''} duration={1800} onHide={() => p.setNotice(null)} style={{ position: 'absolute', bottom: 95, left: 20, right: 20 }} />
    {p.draft && current ? <SetDrawer key={`${p.draft.exerciseId}-${p.draft.setIndex}`} draft={p.draft} exercise={current} onClose={() => p.setDraft(null)} onSave={p.commitSet} /> : null}
    <AppModal visible={quit} onClose={() => setQuit(false)} title="Quitter cette séance ?" actions={<View style={s.stack}><Button text="Continuer ma séance" onPress={() => setQuit(false)} /><Button text="Quitter sans enregistrer" variant="outline" onPress={onHome} /></View>}><Text style={s.body}>Tes saisies ne sont pas sauvegardées après la fermeture du parcours.</Text></AppModal>
    <AppModal visible={!!notice} onClose={() => setNotice(null)} title="Programme" actions={<Button text="Compris" onPress={() => setNotice(null)} />}><Text style={s.body}>{notice}</Text></AppModal>
  </SafeAreaView></View>;
}

const local = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.onboardingBackground }, safe: { flex: 1 },
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18 },
  content: { gap: 12, paddingTop: 12, paddingBottom: 14 },
  footer: { paddingTop: 8, paddingBottom: 8 },
});
