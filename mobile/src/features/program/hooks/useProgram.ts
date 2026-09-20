import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { activeProgramAdjustment, initialCoachSets, useProgramAdjustment } from '@/store/programAdjustment';
import { feedback } from '@/utils/feedback';
import { createExercises, workouts } from '../data';
import type { Debrief, Exercise, Page, PainReport, SetDraft, Workout } from '../types';
import { nextPending, replaceRemaining, saveSet, summarize, withSetCounts } from '../utils';

export function useProgram(initialPage: Page = 'program') {
  const adjustmentSnapshot = useProgramAdjustment();
  const adjustment = activeProgramAdjustment(adjustmentSnapshot);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const [rir, setRir] = useState(2);
  const [page, setPage] = useState<Page>(initialPage);
  const [workout, setWorkout] = useState(workouts[0]);
  const [exercises, setExercises] = useState(() => createExercises(workouts[0].id));
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [draft, setDraft] = useState<SetDraft | null>(null);
  const [autoRest, setAutoRest] = useState(true);
  const [guidedWarmup, setGuidedWarmup] = useState(true);
  const [restHaptics, setRestHaptics] = useState(true);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timerDuration, setTimerDuration] = useState(120);
  const [historyExercise, setHistoryExercise] = useState<Exercise | null>(null);
  const [returnPage, setReturnPage] = useState<Page>('training');
  const [painReports, setPainReports] = useState<PainReport[]>([]);
  const [debrief, setDebrief] = useState<Debrief>({ energy: '3', difficulty: 'adapted', pain: false, comment: '' });
  const [coachApplied, setCoachApplied] = useState(false);
  const [rewardPlayed, setRewardPlayed] = useState(false);
  const [plans, setPlans] = useState<Record<string, Exercise[]>>({});
  const current = exercises[exerciseIndex];
  const stats = summarize(exercises);
  const secondsLeft = deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor(((endedAt ?? now) - startedAt) / 1000));
  useEffect(() => {
    if (startedAt === null || endedAt !== null) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    const subscription = AppState.addEventListener('change', () => setNow(Date.now()));
    return () => { clearInterval(timer); subscription.remove(); };
  }, [startedAt, endedAt]);
  useEffect(() => {
    if ((page !== 'rest' && page !== 'warmup') || deadline === null || secondsLeft > 0) return;
    setDeadline(null);
    setPage('training');
    if (restHaptics && Platform.OS !== 'web' && AppState.currentState === 'active') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  }, [page, deadline, secondsLeft, restHaptics]);
  useEffect(() => {
    if (page === 'rest' && restHaptics && secondsLeft > 0 && secondsLeft <= 3) feedback('light');
  }, [page, restHaptics, secondsLeft]);
  function selectWorkout(selected: Workout) {
    const adapted = selected.id === adjustment?.workoutId ? adjustment : null;
    const base = plans[selected.id] ?? createExercises(selected.id);
    setWorkout(adapted ? { ...selected, minutes: adapted.minutes } : selected);
    setExercises(selected.id === 'muscu-b' ? withSetCounts(base, adapted?.sets ?? initialCoachSets) : base);
    setRir(adapted?.rir ?? 2); setExerciseIndex(0);
    setStartedAt(null); setEndedAt(null); setDeadline(null); setPainReports([]); setDraft(null); setCoachApplied(false); setRewardPlayed(false);
    setDebrief({ energy: '3', difficulty: 'adapted', pain: false, comment: '' }); setPage('detail');
  }
  function start() {
    const time = Date.now(); setStartedAt(time); setEndedAt(null); setNow(time);
    if (guidedWarmup) { setTimerDuration(300); setDeadline(time + 300000); setPage('warmup'); }
    else setPage('training');
  }
  function openSet(setIndex: number) {
    if (!current) return;
    const first = current.sets.findIndex(set => !set);
    if (!current.sets[setIndex] && first !== setIndex) return;
    setDraft({ exerciseId: current.id, setIndex, value: current.sets[setIndex] ?? { weight: current.weight, reps: current.targetReps, feeling: null, warmup: false } });
  }
  function commitSet(value: SetDraft, nextWeight?: number) {
    const existing = exercises.find(item => item.id === value.exerciseId)?.sets[value.setIndex];
    const updated = saveSet(exercises, value, nextWeight);
    setExercises(updated); setDraft(null);
    if (existing) return;
    const next = nextPending(updated);
    const completedExercise = updated.find(item => item.id === value.exerciseId)?.sets.every(Boolean);
    feedback(completedExercise ? 'success' : 'selection');
    setNotice({ id: Date.now(), text: !next ? 'Toutes les séries sont terminées !' : completedExercise ? 'Exercice terminé !' : 'Série enregistrée' });
    if (!next) { setEndedAt(Date.now()); setPage('debrief'); return; }
    setExerciseIndex(next.exerciseIndex);
    if (autoRest) {
      const duration = current?.restSeconds ?? 120;
      const time = Date.now(); setNow(time); setTimerDuration(duration); setDeadline(time + duration * 1000); setPage('rest');
    }
  }
  function editExercise(index: number) { setExerciseIndex(index); setReturnPage(page); setPage('replace'); }
  function replaceExercise(replacement: Exercise) {
    const updated = replaceRemaining(exercises, current.id, replacement);
    setExercises(updated);
    const index = updated.findIndex(item => item.id === replacement.id);
    if (index >= 0) setExerciseIndex(index);
    setPage(returnPage);
  }
  function openHistory(exercise: Exercise) { setHistoryExercise(exercise); setReturnPage(page); setPage('history'); }
  function openPain() { setReturnPage(page); setPage('pain'); }
  function savePain(report: PainReport) {
    setPainReports(previous => [...previous, report]); setDebrief(previous => ({ ...previous, pain: true }));
    if (returnPage === 'debrief') setPage('debrief');
    else setPage('replace');
  }
  function adjustTimer(delta: number) {
    const remaining = Math.max(0, secondsLeft + delta);
    const time = Date.now(); setNow(time); setDeadline(time + remaining * 1000);
    setTimerDuration(previous => Math.max(remaining, previous + delta, 1));
  }
  function applyCoach() {
    if (coachApplied) return;
    const planned = exercises.map(exercise => {
      const working = exercise.sets.filter(set => set && !set.warmup);
      const progress = !debrief.pain && !painReports.length && working.length > 0 && working.every(set => set && set.reps >= exercise.maxReps && set.feeling === 'easy');
      return { ...exercise, weight: progress ? exercise.weight + 2.5 : exercise.weight,
        previous: { weight: exercise.weight, reps: working.map(set => set!.reps) }, sets: Array.from({ length: working.length || exercise.sets.length }, () => null) };
    });
    setPlans(previous => ({ ...previous, [workout.id]: planned })); setCoachApplied(true);
  }
  return { notice, setNotice, page, setPage, workout, selectWorkout, exercises, setExercises, exerciseIndex, setExerciseIndex, current, draft, setDraft, rir,
    autoRest, setAutoRest, guidedWarmup, setGuidedWarmup, restHaptics, setRestHaptics, start, startedAt, endedAt, elapsed,
    secondsLeft, timerDuration, adjustTimer, skipTimer: () => { setDeadline(null); setPage('training'); },
    openSet, commitSet, stats, openHistory, historyExercise, returnPage, editExercise, replaceExercise, openPain, savePain, painReports,
    debrief, setDebrief, coachApplied, applyCoach, rewardPlayed, setRewardPlayed,
    finishFree: () => { setEndedAt(Date.now()); setPage('debrief'); },
  };
}
