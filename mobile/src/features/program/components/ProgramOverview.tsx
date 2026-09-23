import {blockProgress,extendBlock,type BlockProgress} from '@/services/workouts';
import { apiRequest } from '@/services/http';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Calendar } from '@/components/Calendar';
import { Card } from '@/components/Card';
import { CardHighlight } from '@/components/CardHighlight';
import { EmptyState } from '@/components/EmptyState';
import { Illustration } from '@/components/Illustration';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { colors } from '@/theme/colors';
import { activeProgramAdjustment, setProgramAdjustment, useProgramAdjustment } from '@/store/programAdjustment';
import { AppModal } from '@/components/AppModal';
import { workouts } from '../data';
import { generatedWorkout } from '../generatedAdapter';
import type { TrainingProgram } from '@/services/trainingProgram';
import type { Workout } from '../types';
import { styles as s } from './styles';

const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function ProgramOverview({ onSelect, program, onRenewed }: { onSelect: (workout: Workout) => void; program?: TrainingProgram; onRenewed?:()=>void }) {
  const [block,setBlock]=useState<BlockProgress|null>(null);
  const [blockError,setBlockError]=useState<string|null>(null);
  const [blockBusy,setBlockBusy]=useState(false);
  useEffect(()=>{if(program?.acceptedAt)void blockProgress(program.proposalId).then(setBlock).catch(e=>setBlockError(e.message));},[program?.proposalId]);
  async function finishBlock(renew:boolean){if(!program||blockBusy)return;setBlockBusy(true);try{if(renew){await apiRequest('/program/generate',{method:'POST',body:{renew:true}});onRenewed?.();}else{await extendBlock(program.proposalId);setBlock(await blockProgress(program.proposalId));}setResetVisible(false);}catch(e){setBlockError(e instanceof Error?e.message:'Réessaie.');}finally{setBlockBusy(false);}}
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
  return <>
    <Text style={s.title}>Mon programme</Text>
    {adjustment ? <Card style={{ padding: 16, gap: 10 }}><Text style={s.section}>Muscu B allégée</Text><Text style={s.body}>14 séries · 50 min · RIR 3{adjustment.scope === 'week' ? ' · cette semaine' : ' · jusqu’à nouvel ordre'}</Text><Button text="Rétablir le programme initial" variant="outline" onPress={() => setResetVisible(true)} /></Card> : null}
    <Card style={{ gap: 12, padding: 14 }}>
      <View style={s.row}><View style={s.grow}><Text style={s.section}>{program?.result?.title ?? 'Phase 1 · Reprise'}</Text><Text style={[s.body, { marginTop: 4 }]}>Semaines 1 à {blockWeeks}</Text></View><Illustration name="calendar" size={54} /></View>
      <View style={{ gap: 7 }}><Text style={s.label}>Semaine {currentWeek} sur {blockWeeks}</Text><ProgressBar progress={currentWeek / blockWeeks * 100} height={12} /></View>
    </Card>
    <TabSelector value={tab} onChange={setTab} items={[{ value: 'sessions', label: 'Séances' }, { value: 'calendar', label: 'Calendrier' }]} />
    {tab === 'calendar' ? <Calendar selectedDate={date} onSelectDate={setDate} /> : null}
    <Text style={s.section}>{week === currentWeek ? 'Mes séances' : `Mes séances · semaine ${week}`}</Text>
    <View style={{ gap: 10 }}>
      {visibleWorkouts.map(original => { const item = adjustment?.workoutId === original.id ? { ...original, minutes: adjustment.minutes } : original; return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Ouvrir ${item.name}, ${days[item.day]}`} onPress={() => onSelect({...original,week:occurrence(original)?.week??week,scheduledDate:occurrence(original)?.date})} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Card style={[s.row, { padding: 7, gap: 12 }]}>
          <View style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: item.kind === 'strength' ? colors.primarySurface : colors.energySurface }}><Illustration name={item.icon} size={60} /></View>
          <View style={[s.grow, { gap: 2 }]}><Text style={[s.section, { fontSize: 16, lineHeight: 22 }]}>{item.name}</Text><Text style={[s.body, { fontSize: 11, lineHeight: 16 }]}>{item.kind === 'strength' ? program ? `${item.prescribedExercises?.length ?? 0} exercices` : `${item.description} · ${adjustment?.workoutId === item.id ? 7 : 8} exercices` : `${item.minutes} min`}</Text>
            <View style={[s.wrap, { gap: 5, marginTop: 2 }]}>
              {item.kind === 'strength' ? <CardHighlight icon={<Symbol name="clock" size={13} color="success" />} title={`${item.minutes} min`} color={colors.successText} backgroundColor="successSurface" style={s.chip} /> : null}
              <CardHighlight icon={<Symbol name="calendar" size={13} color="accent" />} title={`${days[item.day]}${occurrence(item)?.status==='completed'?' · faite':occurrence(item)?.status==='missed'?' · manquée':''}`} color={colors.accent} backgroundColor="accentSurface" style={s.chip} />
            </View>
          </View><Symbol name="chevron" size={18} color="textMuted" />
        </Card>
      </Pressable>; })}
    </View>
    {!visibleWorkouts.length ? <EmptyState title="Journée de récupération" description="Pas de séance prévue à cette date." /> : null}
    <Button text={block?.due ? 'Faire le bilan du programme' : 'Voir les semaines suivantes'} leading={<Symbol name="calendar" />} trailing={<Symbol name="chevron" color="textMuted" />} variant="outline" onPress={() => block?.due ? setResetVisible(true) : setWeeksVisible(true)} style={{ marginTop: 2 }} />
    <BottomSheet visible={weeksVisible} onClose={() => setWeeksVisible(false)} title="Les prochaines semaines">
      <View style={s.stack}>{Array.from({ length: blockWeeks }, (_, i) => i + 1).map(value => <Button key={value} text={`Semaine ${value}${value === currentWeek ? ' · actuelle' : ''}`} variant={week === value ? 'primary' : 'secondary'} onPress={() => { setWeek(value); setWeeksVisible(false); }} />)}</View>
    </BottomSheet>
    <AppModal visible={resetVisible} onClose={() => setResetVisible(false)} title={program?'Bilan du programme':'Rétablir Muscu B ?'}><Text style={s.body}>{program?`${block?.completed??0} séances terminées · ${Math.round((block?.durationSeconds??0)/60)} min. ${block?.recommendation==='renew'?'On peut préparer la suite.':block?.pain?'Des douleurs ont été signalées : fais le point sur tes restrictions avant de progresser.':'On peut prolonger pour consolider tes séances.'}`:'La prochaine séance retrouvera ses 18 séries, 65 minutes et 2 répétitions en réserve.'}{blockError?` ${blockError}`:''}</Text><View style={{ gap: 10, marginTop: 16 }}><Button text={program?"Continuer deux semaines":"Rétablir"} disabled={blockBusy} onPress={() => {if(program)void finishBlock(false);else{setProgramAdjustment(null);setResetVisible(false);}}} /><Button text={program?"Préparer le prochain programme":"Annuler"} disabled={blockBusy} variant="outline" onPress={() => {if(program)void finishBlock(true);else setResetVisible(false);}} /></View></AppModal>
  </>;
}
