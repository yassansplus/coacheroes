import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import type { ProgramBlockSummary } from '@/services/trainingProgram';
import { styles as s } from './styles';

const date = (value: string) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
export function BlockSummary({ summary, showWorkouts = true }: { summary: ProgramBlockSummary; showWorkouts?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <View style={s.stack}>
    <Card style={s.stack}>
      <Text style={s.section}>{summary.title}</Text>
      <Text style={s.body}>{date(summary.startedAt)} – {date(summary.endsAt)} · {summary.weeks} semaines</Text>
      <Text style={s.label}>{summary.completed} séances réalisées sur {summary.planned} prévues</Text>
      <ProgressBar progress={summary.planned ? summary.completed / summary.planned * 100 : 0} height={10} />
      <Text style={s.body}>{summary.durationMinutes} min d’entraînement · {summary.abandoned} séance{summary.abandoned > 1 ? 's' : ''} interrompue{summary.abandoned > 1 ? 's' : ''}</Text>
      <View style={s.wrap}>{summary.weekly.map(item => <Text key={item.week} style={s.body}>S{item.week} : {item.completed}/{item.planned}</Text>)}</View>
      {Object.entries(summary.bySport).map(([sport, count]) => <Text key={sport} style={s.body}>{sport === 'strength' ? 'Musculation' : sport} · {count} séance{count > 1 ? 's' : ''}</Text>)}
      {summary.painSessions ? <Text style={s.body}>Douleur signalée sur {summary.painSessions} séance{summary.painSessions > 1 ? 's' : ''}.</Text> : null}
    </Card>
    <Card style={s.stack}>
      <Text style={s.section}>Ton évolution</Text>
      {summary.exercises.length ? summary.exercises.slice(0, 8).map(exercise =>
        <View key={exercise.id} style={{ gap: 2 }}><Text style={s.label}>{exercise.name}</Text><Text style={s.body}>
          {exercise.first.weightKg} kg × {exercise.first.reps} → {exercise.last.weightKg} kg × {exercise.last.reps} · {exercise.sessions} séances
        </Text></View>) : <Text style={s.body}>Pas encore de séries comparables enregistrées.</Text>}
      <Text style={s.caption}>Première et dernière série représentative : les charges seules ne racontent pas tout.</Text>
    </Card>
    <Card style={s.stack}>
      <Text style={s.section}>Poids et récupération</Text>
      {summary.weight.first && summary.weight.last ? <Text style={s.body}>
        {summary.weight.first.kg} kg ({date(summary.weight.first.date)}) → {summary.weight.last.kg} kg ({date(summary.weight.last.date)}) · {summary.weight.entries.length} pesée{summary.weight.entries.length > 1 ? 's' : ''}
      </Text> : <Text style={s.body}>Pas de pesée enregistrée pendant ce bloc.</Text>}
      {summary.recovery.checkIns ? <Text style={s.body}>{summary.recovery.checkIns} bilans quotidiens · énergie moyenne {summary.recovery.energy ?? '—'}/5</Text>
        : <Text style={s.body}>Aucun bilan quotidien enregistré.</Text>}
    </Card>
    {showWorkouts ? <Card style={s.stack}><Text style={s.section}>Tes séances</Text>
      {summary.workouts.length ? summary.workouts.map(workout => <View key={workout.id} style={{ gap: 5 }}>
        <Button variant="secondary" text={`${date(workout.startedAt)} · ${workout.name} · ${workout.status === 'completed' ? 'faite' : 'interrompue'}`}
          onPress={() => setExpanded(expanded === workout.id ? null : workout.id)} />
        {expanded === workout.id ? <View style={{ paddingHorizontal: 8, gap: 5 }}>
          <Text style={s.body}>{Math.round((workout.summary.durationSeconds ?? 0) / 60)} min · {workout.summary.sets ?? 0} séries{workout.summary.pain ? ' · douleur signalée' : ''}</Text>
          {workout.summary.difficulty ? <Text style={s.body}>Ressenti : {workout.summary.difficulty} · énergie {workout.summary.energy ?? '—'}/5</Text> : null}
          {workout.summary.comment ? <Text style={s.body}>{workout.summary.comment}</Text> : null}
          {workout.exercises.map(exercise => <Text key={exercise.id} style={s.body}>{exercise.name} : {exercise.sets.map(set => `${set.weightKg} kg × ${set.reps}`).join(' · ') || 'aucune série saisie'}</Text>)}
        </View> : null}
      </View>) : <Text style={s.body}>Aucune séance enregistrée sur ce bloc.</Text>}
    </Card> : null}
  </View>;
}
