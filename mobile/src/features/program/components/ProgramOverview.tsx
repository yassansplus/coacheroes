import { useState } from 'react';
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
import type { Workout } from '../types';
import { styles as s } from './styles';

const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function ProgramOverview({ onSelect }: { onSelect: (workout: Workout) => void }) {
  const adjustment = activeProgramAdjustment(useProgramAdjustment());
  const [resetVisible, setResetVisible] = useState(false);
  const [tab, setTab] = useState('sessions');
  const [date, setDate] = useState(new Date());
  const [weeksVisible, setWeeksVisible] = useState(false);
  const [week, setWeek] = useState(2);
  const visibleWorkouts = tab === 'calendar' ? workouts.filter(item => item.day === date.getDay()) : workouts;
  return <>
    <Text style={s.title}>Mon programme</Text>
    {adjustment ? <Card style={{ padding: 16, gap: 10 }}><Text style={s.section}>Muscu B allégée</Text><Text style={s.body}>14 séries · 50 min · RIR 3{adjustment.scope === 'week' ? ' · cette semaine' : ' · jusqu’à nouvel ordre'}</Text><Button text="Rétablir le programme initial" variant="outline" onPress={() => setResetVisible(true)} /></Card> : null}
    <Card style={{ gap: 12, padding: 14 }}>
      <View style={s.row}><View style={s.grow}><Text style={s.section}>Phase 1 · Reprise</Text><Text style={[s.body, { marginTop: 4 }]}>Semaines 1 à 4</Text></View><Illustration name="calendar" size={54} /></View>
      <View style={{ gap: 7 }}><Text style={s.label}>Semaine 2 sur 4</Text><ProgressBar progress={50} height={12} /></View>
    </Card>
    <TabSelector value={tab} onChange={setTab} items={[{ value: 'sessions', label: 'Séances' }, { value: 'calendar', label: 'Calendrier' }]} />
    {tab === 'calendar' ? <Calendar selectedDate={date} onSelectDate={setDate} /> : null}
    <Text style={s.section}>{week === 2 ? 'Mes séances' : `Mes séances · semaine ${week}`}</Text>
    <View style={{ gap: 10 }}>
      {visibleWorkouts.map(original => { const item = adjustment?.workoutId === original.id ? { ...original, minutes: adjustment.minutes } : original; return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Ouvrir ${item.name}, ${days[item.day]}`} onPress={() => onSelect(original)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <Card style={[s.row, { padding: 7, gap: 12 }]}>
          <View style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: item.kind === 'strength' ? colors.primarySurface : colors.energySurface }}><Illustration name={item.icon} size={60} /></View>
          <View style={[s.grow, { gap: 2 }]}><Text style={[s.section, { fontSize: 16, lineHeight: 22 }]}>{item.name}</Text><Text style={[s.body, { fontSize: 11, lineHeight: 16 }]}>{item.kind === 'strength' ? `${item.description} · ${adjustment?.workoutId === item.id ? 7 : 8} exercices` : `Technique · ${item.minutes} min`}</Text>
            <View style={[s.wrap, { gap: 5, marginTop: 2 }]}>
              {item.kind === 'strength' ? <CardHighlight icon={<Symbol name="clock" size={13} color="success" />} title={`${item.minutes} min`} color={colors.successText} backgroundColor="successSurface" style={s.chip} /> : null}
              <CardHighlight icon={<Symbol name="calendar" size={13} color="accent" />} title={days[item.day]} color={colors.accent} backgroundColor="accentSurface" style={s.chip} />
            </View>
          </View><Symbol name="chevron" size={18} color="textMuted" />
        </Card>
      </Pressable>; })}
    </View>
    {!visibleWorkouts.length ? <EmptyState title="Journée de récupération" description="Pas de séance prévue à cette date." /> : null}
    <Button text="Voir les semaines suivantes" leading={<Symbol name="calendar" />} trailing={<Symbol name="chevron" color="textMuted" />} variant="outline" onPress={() => setWeeksVisible(true)} style={{ marginTop: 2 }} />
    <BottomSheet visible={weeksVisible} onClose={() => setWeeksVisible(false)} title="Les prochaines semaines">
      <View style={s.stack}>{[2, 3, 4].map(value => <Button key={value} text={`Semaine ${value}${value === 2 ? ' · actuelle' : ''}`} variant={week === value ? 'primary' : 'secondary'} onPress={() => { setWeek(value); setWeeksVisible(false); }} />)}</View>
    </BottomSheet>
    <AppModal visible={resetVisible} onClose={() => setResetVisible(false)} title="Rétablir Muscu B ?"><Text style={s.body}>La prochaine séance retrouvera ses 18 séries, 65 minutes et 2 répétitions en réserve.</Text><View style={{ gap: 10, marginTop: 16 }}><Button text="Rétablir" onPress={() => { setProgramAdjustment(null); setResetVisible(false); }} /><Button text="Annuler" variant="outline" onPress={() => setResetVisible(false)} /></View></AppModal>
  </>;
}
