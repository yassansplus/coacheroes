import { useDaily } from '@/providers/DailyProvider';
import { dailyDate } from '@/services/daily';
import { applyDailyAdjustment } from '@/services/daily/adjustment';
import { useSession } from '@/providers/SessionProvider';
import {analyzeWorkout,applyWorkoutAnalysis,type WorkoutAnalysis,queueWorkout,syncWorkouts,restoreWorkout,exerciseHistory,newWorkoutId,workoutSyncState,type WorkoutSnapshot,type ExerciseHistoryEntry} from '@/services/workouts';
import { useEffect, useState, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { activeProgramAdjustment, initialCoachSets, useProgramAdjustment } from '@/store/programAdjustment';
import { feedback } from '@/utils/feedback';
import { createExercises, workouts } from '../data';
import type { Debrief, Exercise, Page, PainReport, SetDraft, Workout } from '../types';
import { nextPending, replaceRemaining, saveSet, summarize, withSetCounts } from '../utils';

export function useProgram(initialPage: Page = 'program', initialWorkout?: Workout) {
  const {user}=useSession();
  const daily=useDaily();
  const dailyApplied=useRef<string | null>(null);
  const [hydrated,setHydrated]=useState(false);
  const [sessionId,setSessionId]=useState<string|null>(null);
  const [status,setStatus]=useState<WorkoutSnapshot['status']>('in_progress');
  const [historyRows,setHistoryRows]=useState<ExerciseHistoryEntry[]>([]);
  const [historyError,setHistoryError]=useState<string|null>(null);
  const [analysis,setAnalysis]=useState<WorkoutAnalysis|null>(null);
  const [analysisError,setAnalysisError]=useState<string|null>(null);
  const [syncError,setSyncError]=useState<string|null>(null);
  const lastSaved=useRef('');
  const pendingSave=useRef<Promise<unknown>>(Promise.resolve());
  const actionBusy=useRef(false);
  const adjustmentSnapshot = useProgramAdjustment();
  const adjustment = activeProgramAdjustment(adjustmentSnapshot);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const [rir, setRir] = useState(initialWorkout?.prescribedExercises?.[0]?.rir ?? 2);
  const [page, setPage] = useState<Page>(initialPage);
  const [workout, setWorkout] = useState(initialWorkout ?? workouts[0]);
  const [exercises, setExercises] = useState(() => initialWorkout?.prescribedExercises ?? createExercises(workouts[0].id));
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
  const snapshot: WorkoutSnapshot | null=startedAt===null?null:{workout,exercises,startedAt,endedAt,status,
    timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',debrief,painReports,
    sportMetrics:{durationSeconds:endedAt?Math.floor((endedAt-startedAt)/1000):null,distanceMeters:null,rounds:null,intensity:null},
    resume:{page:(status!=='in_progress'?'summary':['warmup','training','rest','debrief','summary','coach'].includes(page)?page:endedAt?'debrief':'training') as WorkoutSnapshot['resume']['page'],exerciseIndex:status==='in_progress'?exerciseIndex:0,deadline:status==='in_progress'?deadline:null,timerDuration,rir,autoRest,guidedWarmup,restHaptics}};
  const snapshotRef=useRef(snapshot);snapshotRef.current=snapshot;
  useEffect(()=>{
    let alive=true;setHydrated(false);
    if(!user){setHydrated(true);return;}
    void restoreWorkout(user.id,initialPage==='program'?undefined:initialWorkout?.id).then(saved=>{
      if(!alive||!saved)return;
      const v=saved.snapshot;setWorkout(v.workout);setExercises(v.exercises);setSessionId(saved.id);setStartedAt(v.startedAt);setEndedAt(v.endedAt);setStatus(v.status);setDebrief(v.debrief);setPainReports(v.painReports);
      setPage(v.resume.page);setExerciseIndex(v.resume.exerciseIndex);setDeadline(v.resume.deadline);setTimerDuration(v.resume.timerDuration);setRir(v.resume.rir);setAutoRest(v.resume.autoRest);setGuidedWarmup(v.resume.guidedWarmup);setRestHaptics(v.resume.restHaptics);
      lastSaved.current=JSON.stringify(v);setSyncError(saved.error??null);
    }).catch(e=>{if(alive)setSyncError(e.message);}).finally(()=>{if(alive)setHydrated(true);});
    return()=>{alive=false;};
  },[user?.id]);
  useEffect(() => {
    if (!hydrated || startedAt !== null) return;
    const proposal = daily.status?.row?.adjustment?.decision === 'accepted' ? daily.status.row.adjustment.proposal : null;
    const key = `${workout.id}:${proposal?.id ?? ''}`;
    if (dailyApplied.current === key) return;
    const result = applyDailyAdjustment(workout, exercises, proposal, dailyDate());
    if (!result) return;
    dailyApplied.current = key;
    setWorkout(result.workout); setExercises(result.exercises);
    setRir(Math.max(3, ...result.exercises.map(e => e.rir ?? 3)));
  }, [hydrated, startedAt, workout, daily.status]);
  async function persist(value:WorkoutSnapshot,id=sessionId){
    if(!user||!id)return;
    const owner=user.id;
    const next=pendingSave.current.catch(()=>{}).then(()=>queueWorkout(owner,id,value));
    pendingSave.current=next;await next;
    void syncWorkouts(owner).then(async()=>{const state=await workoutSyncState(owner,id);setSyncError(state?.error??null);}).catch(e=>setSyncError(e.message));
  }
  useEffect(()=>{
    if(!hydrated||!snapshot||!sessionId||!user)return;
    const serial=JSON.stringify(snapshot);if(serial===lastSaved.current)return;lastSaved.current=serial;
    void persist(snapshot).catch(e=>{lastSaved.current='';setSyncError(e.message);});
  },[hydrated,sessionId,exercises,debrief,painReports,startedAt,endedAt,status,page,exerciseIndex,deadline,timerDuration,rir,autoRest,guidedWarmup,restHaptics]);
  async function finish(){
    const value=snapshotRef.current;if(!value)return;
    const end=value.endedAt??Date.now();
    const done={...value,endedAt:end,status:'completed' as const,sportMetrics:{...value.sportMetrics,durationSeconds:Math.floor((end-value.startedAt)/1000)},resume:{...value.resume,page:'summary' as const,exerciseIndex:0,deadline:null}};
    try{await persist(done);lastSaved.current=JSON.stringify(done);setStatus('completed');setEndedAt(end);setPage('summary');}catch(e){setSyncError(e instanceof Error?e.message:'Enregistrement impossible.');}
  }
  async function abandon(){const value=snapshotRef.current;if(!value)return true;try{await persist({...value,status:'abandoned',endedAt:value.endedAt??Date.now()});setEndedAt(value.endedAt??Date.now());setStatus('abandoned');return true;}catch(e){setSyncError(e instanceof Error?e.message:'Enregistrement impossible.');return false;}}
  async function hydrateExercises(items:Exercise[]){
    return Promise.all(items.map(async e=>{try{const rows=await exerciseHistory(e.id,user?.id);const last=rows[0];const sets=last?.exercise.sets.filter(v=>v&&!v.warmup)??[];
      return {...e,weight:last?.next?.weight??sets.at(-1)?.weight??0,targetReps:last?.next?.targetReps??e.targetReps,previous:{weight:sets.at(-1)?.weight??0,reps:sets.map(v=>v!.reps),recordWeight:last?.record?.weight,recordReps:last?.record?.reps}};
    }catch{return {...e,weight:0,previous:{weight:0,reps:[]}};}}));
  }
  async function selectWorkout(selected: Workout) {
    dailyApplied.current = null;
    const adapted = selected.id === adjustment?.workoutId ? adjustment : null;
    const base = await hydrateExercises(plans[selected.id] ?? selected.prescribedExercises ?? createExercises(selected.id));
    setSessionId(null);setStatus('in_progress');lastSaved.current='';
    setWorkout(adapted ? { ...selected, minutes: adapted.minutes } : selected);
    setExercises(selected.id === 'muscu-b' ? withSetCounts(base, adapted?.sets ?? initialCoachSets) : base);
    setRir(selected.prescribedExercises?.[0]?.rir ?? adapted?.rir ?? 2); setExerciseIndex(0);
    setStartedAt(null); setEndedAt(null); setDeadline(null); setPainReports([]); setDraft(null); setCoachApplied(false); setRewardPlayed(false);
    setDebrief({ energy: '3', difficulty: 'adapted', pain: false, comment: '' }); setPage('detail');
  }
  async function start() {
    if(!hydrated||!user||actionBusy.current)return;actionBusy.current=true;
    const calibrated=await hydrateExercises(exercises);setExercises(calibrated);setSessionId(newWorkoutId());setStatus('in_progress');lastSaved.current='';
    const time = Date.now(); setStartedAt(time); setEndedAt(null); setNow(time);
    if (guidedWarmup) { const duration = (workout.warmupMinutes ?? 5) * 60; setTimerDuration(duration); setDeadline(time + duration * 1000); setPage('warmup'); }
    else setPage('training');
    actionBusy.current=false;
  }
  function openSet(setIndex: number) {
    if (!current) return;
    const first = current.sets.findIndex(set => !set);
    if (!current.sets[setIndex] && first !== setIndex) return;
    setDraft({ exerciseId: current.id, setIndex, value: current.sets[setIndex] ?? { weight: current.weight, reps: current.targetReps, feeling: null, warmup: false } });
  }
  function commitSet(value: SetDraft, nextWeight?: number) {
    const existing = exercises.find(item => item.id === value.exerciseId)?.sets[value.setIndex];
    const time=new Date().toISOString();
    value={...value,value:{...value.value,id:existing?.id??newWorkoutId(),occurredAt:existing?.occurredAt??time,updatedAt:time}};
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
  function openHistory(exercise: Exercise) { setHistoryExercise(exercise); setHistoryRows([]);setHistoryError(null);setReturnPage(page); setPage('history');void exerciseHistory(exercise.id,user?.id).then(setHistoryRows).catch(e=>setHistoryError(e.message)); }
  function openPain() { setReturnPage(page); setPage('pain'); }
  function savePain(report: PainReport) {
    setPainReports(previous => [...previous, {...report,id:report.id??newWorkoutId(),occurredAt:report.occurredAt??new Date().toISOString()}]); setDebrief(previous => ({ ...previous, pain: true }));
    if (returnPage === 'debrief') setPage('debrief');
    else setPage(workout.generated ? 'training' : 'replace');
  }
  function adjustTimer(delta: number) {
    const remaining = Math.max(0, secondsLeft + delta);
    const time = Date.now(); setNow(time); setDeadline(time + remaining * 1000);
    setTimerDuration(previous => Math.max(remaining, previous + delta, 1));
  }
  async function requestAnalysis(){setPage('coach');setAnalysis(null);setAnalysisError(null);if(!sessionId||!user)return;try{await pendingSave.current;await syncWorkouts(user.id);const state=await workoutSyncState(user.id,sessionId);if(state?.pending.length)throw new Error(state.error??'Reconnecte-toi pour analyser ta séance enregistrée.');setAnalysis(await analyzeWorkout(sessionId));}catch(e){setAnalysisError(e instanceof Error?e.message:'Analyse indisponible.');}}
  async function applyCoach(){if(coachApplied||!analysis||!sessionId)return;try{await applyWorkoutAnalysis(sessionId,analysis.sourceRevision);setPlans(previous=>({...previous,[workout.id]:exercises.map(e=>{const change=analysis.recommendations.find(r=>r.exerciseId===e.id);return {...e,weight:change?.weight??e.weight,targetReps:change?.targetReps??e.targetReps,sets:e.sets.filter(s=>!s?.warmup).map(()=>null)};})}));setCoachApplied(true);}catch(e){setAnalysisError(e instanceof Error?e.message:'Application impossible.');}}
  return { analysis,analysisError,requestAnalysis,hydrated,sessionId,status,finish,abandon,historyRows,historyError,syncError, notice, setNotice, page, setPage, workout, selectWorkout, exercises, setExercises, exerciseIndex, setExerciseIndex, current, draft, setDraft, rir,
    autoRest, setAutoRest, guidedWarmup, setGuidedWarmup, restHaptics, setRestHaptics, start, startedAt, endedAt, elapsed,
    secondsLeft, timerDuration, adjustTimer, skipTimer: () => { setDeadline(null); setPage('training'); },
    openSet, commitSet, stats, openHistory, historyExercise, returnPage, editExercise, replaceExercise, openPain, savePain, painReports,
    debrief, setDebrief, coachApplied, applyCoach, rewardPlayed, setRewardPlayed,
    finishFree: () => { setEndedAt(Date.now()); setPage('debrief'); },
  };
}
