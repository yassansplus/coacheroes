import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AnimatedMetricText, Motion } from '@/components/Motion';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { CardHighlight } from '@/components/CardHighlight';
import { Illustration } from '@/components/Illustration';
import { PillSelector } from '@/components/PillSelector';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol, type SymbolName } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { TextField } from '@/components/TextField';
import { Toggle } from '@/components/Toggle';
import { XPRewardCard } from '@/components/XPRewardCard';
import { colors } from '@/theme/colors';
import type { useProgram } from '../hooks/useProgram';
import type { Exercise } from '../types';
import { clockLabel } from '../utils';
import { styles as s } from './styles';

type Program = ReturnType<typeof useProgram>;
const tints = [colors.primarySurface, colors.successSurface, colors.energySurface, colors.accentSurface];
const inks = [colors.primary, colors.success, colors.energy, colors.accent];

export function Glyph({ name, index = 0, size = 40 }: { name: SymbolName; index?: number; size?: number }) {
  return <View style={[s.glyph, { backgroundColor: tints[index % 4], width: size, height: size }]}><Symbol name={name} color={inks[index % 4]} /></View>;
}
export function StatTiles({ items, ribbon = false }: { items: { label: string; value: string | number; icon: SymbolName }[]; ribbon?: boolean }) {
  const contents = items.map((item, index) => <View key={item.label} style={{ flex: 1, minWidth: 0, gap: 7, alignItems: ribbon ? 'center' : 'flex-start', paddingHorizontal: ribbon ? 4 : 0 }}>
    <Glyph name={item.icon} index={index + 1} /><Text style={[s.body, ribbon && s.center]}>{item.label}</Text><AnimatedMetricText value={item.value} delay={index * 90} adjustsFontSizeToFit numberOfLines={1} style={[s.section, { fontSize: ribbon ? 17 : 23 }]} />
  </View>);
  return ribbon ? <Card style={[s.row, { gap: 4, padding: 16, alignItems: 'flex-start' }]}>{contents}</Card> : <View style={s.wrap}>{contents.map((item, i) => <Card key={i} style={s.tile}>{item}</Card>)}</View>;
}

export function SessionDetail({ p, editing, showAll, onHistory }: { p: Program; editing: boolean; showAll: boolean; onHistory: (exercise: Exercise) => void }) {
  return <>
    <Card style={s.row}><Illustration name={p.workout.icon} size={82} /><View style={[s.grow, { gap: 8 }]}><Text style={s.section}>{p.workout.description}</Text><Text style={s.body}>{p.workout.minutes} min · {p.exercises.length ? `${p.exercises.length} exercices` : 'Séance libre'}</Text>
      {p.exercises.length ? <View style={[s.wrap, { gap: 6 }]}><CardHighlight icon={null} title="Force & volume" backgroundColor="successSurface" color={colors.successText} style={s.chip} /><CardHighlight icon={null} title={`RIR ${p.rir}`} backgroundColor="accentSurface" color={colors.text} style={s.chip} /></View> : null}
    </View></Card>
    {p.workout.generated ? <Text style={s.body}>{p.exercises.length ? 'Choisis tes charges à ton rythme pour cette première séance.' : 'Suis les étapes ci-dessous, à ton rythme.'}</Text> : null}
    <Text style={[s.section, { marginTop: 10 }]}>{p.workout.sportBlocks?.length ? 'Ta séance' : 'Exercices'}</Text>
    {p.workout.sportBlocks?.map((block, i) => <Card key={i} style={s.stack}><Text style={s.label}>{block.title} · {block.minutes} min</Text><Text style={s.body}>{block.instruction}</Text></Card>)}
    {editing ? <Text style={s.body}>Choisis l’exercice à remplacer.</Text> : null}
    <View style={{ gap: 9 }}>{p.exercises.slice(0, showAll ? undefined : 6).map((exercise, index) => <Pressable key={exercise.id} accessibilityRole="button" accessibilityLabel={`${exercise.name}, ${editing ? 'remplacer' : 'historique'}`} onPress={() => editing ? p.editExercise(index) : onHistory(exercise)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card style={[s.row, { padding: 12, gap: 9 }]}><View style={{ width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: tints[index % 4] }}><Text style={[s.label, { color: inks[index % 4] }]}>{index + 1}</Text></View><Illustration name={exercise.icon} size={35} /><View style={s.grow}><Text style={s.label}>{exercise.name}</Text><Text style={s.body}>{exercise.sets.filter(set => !set?.warmup).length} × {exercise.minReps}–{exercise.maxReps}</Text></View><Text style={s.label}>{exercise.weight ? `${exercise.weight} kg` : 'À calibrer'}</Text><Symbol name="chevron" size={16} color="textMuted" /></Card>
    </Pressable>)}</View>
    {!p.exercises.length ? <Card><Text style={s.body}>Enregistre ta durée et ton ressenti à la fin de cette séance libre.</Text></Card> : null}
  </>;
}

export function SessionReady({ p, totalSets }: { p: Program; totalSets: number }) {
  return <>
    <Text style={[s.title, s.center]}>Séance prête</Text>
    <Card style={{ gap: 10, padding: 18 }}><Illustration name={p.workout.icon} size={90} style={{ alignSelf: 'center' }} />
      {[{ name: 'list' as const, text: p.exercises.length ? `${p.exercises.length} exercices` : 'Séance libre' }, { name: 'layers' as const, text: `${totalSets} séries` }, { name: 'clock' as const, text: `Durée estimée ${p.workout.minutes} min` }, { name: 'chart' as const, text: `Intensité RIR ${p.rir}` }].filter((_, i) => p.exercises.length || (i !== 1 && i !== 3)).map((item, i) => <View key={item.name} style={[s.row, i > 0 && s.divider, { paddingTop: i ? 8 : 0 }]}><Glyph name={item.name} index={i + 1} size={36} /><Text style={[s.section, s.grow]}>{item.text}</Text></View>)}
    </Card>
    <Text style={s.section}>Options</Text>
    <Card style={[s.row, s.compact]}><Glyph name="chart" index={1} /><View style={s.grow}><Toggle label="Échauffement guidé" value={p.guidedWarmup} onValueChange={p.setGuidedWarmup} /><Text style={s.body}>{p.workout.warmupMinutes ?? 5} minutes</Text></View></Card>
    {p.exercises.length ? <Card style={[s.row, s.compact]}><Glyph name="clock" index={3} /><View style={s.grow}><Toggle label="Chronomètre automatique" value={p.autoRest} onValueChange={p.setAutoRest} /><Text style={s.body}>Après chaque série</Text></View></Card> : null}
    <Card style={[s.row, s.compact]}><Glyph name="info" /><Text style={[s.body, s.grow]}>{p.workout.generated ? 'Calibre tes charges selon les consignes et les répétitions en réserve. Les séries saisies restent sur cet écran : leur sauvegarde sera disponible dans une prochaine version.' : 'Les charges proposées utilisent la dernière séance d’exemple.'}</Text></Card>
  </>;
}

export function SessionTraining({ p }: { p: Program }) {
  const exercise = p.current;
  if (!exercise) return <><Illustration name={p.workout.icon} size={145} style={{ alignSelf: 'center' }} /><Text style={s.title}>{p.workout.name}</Text>{p.workout.sportBlocks?.map((block, i) => <Card key={i} style={s.stack}><Text style={s.label}>{block.title} · {block.minutes} min</Text><Text style={s.body}>{block.instruction}</Text></Card>)}<Card style={s.row}><Glyph name="clock" /><Text style={s.value}>{clockLabel(p.elapsed)}</Text></Card></>;
  const first = exercise.sets.findIndex(set => !set);
  const count = exercise.sets.filter(set => !set?.warmup).length;
  return <>
    <View style={s.row}><ProgressBar style={s.grow} progress={(p.exerciseIndex + 1) / p.exercises.length * 100} height={10} /><Text style={s.caption}>Exercice {p.exerciseIndex + 1} sur {p.exercises.length}</Text></View>
    <Text style={s.title}>{exercise.name}</Text>
    <View style={s.wrap}><CardHighlight icon={<Symbol name="dumbbell" color="success" size={18} />} title={exercise.muscle} color={colors.successText} backgroundColor="successSurface" style={s.chip} /><CardHighlight icon={<Symbol name="chart" color="accent" size={18} />} title={`${count} × ${exercise.minReps}–${exercise.maxReps}`} color={colors.accent} backgroundColor="accentSurface" style={s.chip} /></View>
    {exercise.guidance ? <Card style={s.stack}><Text style={s.body}>{exercise.guidance}</Text><Text style={s.body}>Garde {exercise.rir} répétitions en réserve.</Text></Card> : null}
    <Card style={s.row}><Illustration name="target" size={53} /><View style={[s.grow, { gap: 5 }]}><Text style={s.label}>Objectif</Text><Text style={s.section}>{exercise.weight ? `${exercise.weight} kg` : 'À calibrer'} · viser {Array.from({ length: count }, () => exercise.targetReps).join(' / ')}</Text>{exercise.previous.reps.length ? <Text style={s.body}>Dernière séance : {exercise.previous.reps.join(' / ')}</Text> : null}</View></Card>
    <Text style={s.section}>Séries</Text>
    <Card style={{ padding: 12, gap: 6 }}><View style={[s.row, { gap: 6, paddingBottom: 6 }]}><Text style={[s.caption, { width: 32 }]}>Série</Text><Text style={[s.caption, s.grow, s.center]}>Charge</Text><Text style={[s.caption, s.grow, s.center]}>Répétitions</Text><Text style={[s.caption, { width: 56, textAlign: 'center' }]}>Ressenti</Text></View>
      {exercise.sets.map((set, index) => {
        const enabled = !!set || index === first;
        return <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Série ${index + 1}, ${set ? 'modifier' : 'saisir'}`} disabled={!enabled} accessibilityState={{ disabled: !enabled }} onPress={() => p.openSet(index)} style={({ pressed }) => [s.row, s.divider, { gap: 6, paddingVertical: 10, opacity: !enabled ? 0.45 : pressed ? 0.6 : 1 }]}>
          <View style={[s.glyph, { width: 30, height: 30, borderRadius: 16 }]}><Text style={[s.label, { color: colors.primary }]}>{set?.warmup ? 'É' : exercise.sets.slice(0, index + 1).filter(item => !item?.warmup).length}</Text></View>
          <View style={[s.grow, { backgroundColor: colors.primarySurface, paddingVertical: 10, borderRadius: 12 }]}><Text style={[s.label, s.center]}>{set?.weight ?? exercise.weight} kg</Text></View>
          <View style={[s.grow, { backgroundColor: colors.primarySurface, paddingVertical: 10, borderRadius: 12 }]}><Text style={[s.label, s.center]}>{set?.reps ?? (index === first ? exercise.targetReps : '—')}</Text></View>
          <View style={{ width: 56, alignItems: 'center' }}>{set ? <Motion pop trigger={`${set.weight}-${set.reps}`}><Symbol name="check" size={19} color="success" /></Motion> : <Text style={s.body}>—</Text>}</View>
        </Pressable>;
      })}
    </Card>
    <Card style={s.row}><Glyph name="clock" index={3} /><View><Text style={s.body}>Temps de séance</Text><Text style={s.value}>{clockLabel(p.elapsed)}</Text></View></Card>
  </>;
}

export function SessionDebrief({ p }: { p: Program }) {
  return <>
    <Text style={s.title}>Débrief</Text>
    <StatTiles ribbon items={[{ label: 'Durée', value: `${Math.floor(p.elapsed / 60)} min`, icon: 'clock' }, { label: 'Séries', value: p.stats.sets, icon: 'dumbbell' }, { label: 'Volume', value: `${p.stats.volume.toLocaleString('fr-FR')} kg`, icon: 'layers' }]} />
    <Card style={{ gap: 8, padding: 18 }}><Text style={s.section}>Énergie</Text><Text style={s.body}>Comment te sens-tu ?</Text><PillSelector variant="filled" itemStyle={{ flex: 1 }} value={p.debrief.energy} onChange={energy => p.setDebrief({ ...p.debrief, energy })} items={[1, 2, 3, 4, 5].map(value => ({ value: String(value), label: String(value) }))} /><View style={s.row}><Text style={[s.caption, s.grow]}>Très faible</Text><Text style={s.caption}>Excellente</Text></View></Card>
    <Card style={{ gap: 8, padding: 18 }}><Text style={s.section}>Difficulté globale</Text><Text style={s.body}>Comment était la séance globalement ?</Text><TabSelector value={p.debrief.difficulty} onChange={difficulty => p.setDebrief({ ...p.debrief, difficulty })} items={[{ value: 'easy', label: 'Facile' }, { value: 'adapted', label: 'Adaptée' }, { value: 'hard', label: 'Trop difficile' }]} /></Card>
    <Card style={{ gap: 8, padding: 18 }}><Text style={s.section}>Douleur inhabituelle</Text><Text style={s.body}>As-tu ressenti une douleur inhabituelle ?</Text><TabSelector value={p.debrief.pain ? 'yes' : 'no'} onChange={value => p.setDebrief({ ...p.debrief, pain: value === 'yes' })} items={[{ value: 'no', label: 'Non' }, { value: 'yes', label: 'Oui' }]} />{p.debrief.pain ? <Button variant="outline" text="Préciser la douleur" onPress={p.openPain} /> : null}{p.painReports.length ? <Text style={s.caption}>{p.painReports.length} signalement(s) enregistré(s)</Text> : null}</Card>
    <Card style={{ gap: 8, padding: 18 }}><Text style={s.section}>Commentaire facultatif</Text><TextField multiline maxLength={500} placeholder={p.workout.kind==='free'?'Ex. Distance : 5 km ; 6 rounds':'Ajoute un commentaire si tu le souhaites…'} value={p.debrief.comment} onChangeText={comment => p.setDebrief({ ...p.debrief, comment })} /><Text style={[s.caption, { textAlign: 'right' }]}>{p.debrief.comment.length} / 500</Text></Card>
  </>;
}

export function SessionSummary({ p, onHistory }: { p: Program; onHistory: (exercise: Exercise) => void }) {
  const [expanded, setExpanded] = useState(false);
  return <>
    <Text style={s.title}>{p.workout.name}</Text>
    <XPRewardCard gainedXP={p.workout.kind === 'free' ? 80 : p.stats.xp} animated={!p.rewardPlayed} haptics={!p.rewardPlayed} />
    <StatTiles items={[{ label: 'Durée', value: `${Math.floor(p.elapsed / 60)} min`, icon: 'clock' }, { label: 'Volume', value: `${p.stats.volume.toLocaleString('fr-FR')} kg`, icon: 'dumbbell' }, { label: 'Séries', value: p.stats.sets, icon: 'layers' }, { label: 'Records', value: p.stats.records, icon: 'chart' }]} />
    {p.exercises.length ? <><Text style={s.section}>Progression</Text><Card style={{ gap: 12, padding: 16 }}>{p.exercises.slice(0, expanded ? undefined : 3).map((exercise, index) => {
      const sets = exercise.sets.filter(set => set && !set.warmup);
      const bestWeight = Math.max(...sets.map(set => set!.weight), 0);
      const delta = bestWeight - exercise.previous.weight;
      const reps = sets.reduce((sum, set) => sum + set!.reps, 0) - exercise.previous.reps.reduce((sum, n) => sum + n, 0);
      const progress = !exercise.previous.reps.length ? 'Nouveau' : delta > 0 ? `+${delta} kg` : delta === 0 && reps > 0 ? `+${reps} reps` : delta < 0 ? `${delta} kg` : 'Stable';
      return <Pressable key={exercise.id} accessibilityRole="button" accessibilityLabel={`${exercise.name}, historique`} onPress={() => onHistory(exercise)} style={({ pressed }) => [s.row, index > 0 && s.divider, { paddingTop: index ? 12 : 0, opacity: pressed ? 0.6 : 1 }]}><Illustration name={exercise.icon} size={36} /><Text style={[s.label, s.grow]}>{exercise.name}</Text><CardHighlight icon={null} title={progress} backgroundColor={delta > 0 || reps > 0 ? 'successSurface' : 'accentSurface'} color={delta > 0 || reps > 0 ? colors.successText : colors.textSecondary} style={s.chip} /></Pressable>;
    })}{p.exercises.length > 3 ? <Button text={expanded ? 'Réduire' : `Voir les ${p.exercises.length - 3} autres exercices`} variant="secondary" backgroundColor="transparent" textColor={colors.primary} onPress={() => setExpanded(!expanded)} /> : null}</Card></> : null}
  </>;
}

export function CoachAnalysis({ p }: { p: Program }) {
  const [detail, setDetail] = useState<string | null>(null);
  const [dataVisible, setDataVisible] = useState(false);
  return <>
    <View style={s.row}><Illustration name="coach" size={64} /><Text style={[s.title, s.grow]}>Analyse du coach</Text></View>
    <StatTiles ribbon items={[{ label: 'Exercices', value: `${p.stats.completedExercises}/${p.exercises.length}`, icon: 'dumbbell' }, { label: 'Records', value: p.stats.records, icon: 'chart' }, { label: 'Douleur signalée', value: p.debrief.pain || p.painReports.length ? 'Oui' : 'Non', icon: 'warning' }]} />
    <Card style={s.stack}><Text style={s.section}>Décisions</Text>{p.analysisError?<Text style={s.body}>{p.analysisError}</Text>:!p.analysis?<Text style={s.body}>Lecture de ta séance…</Text>:<><Text style={s.body}>{p.analysis.reply}</Text>{p.exercises.map(exercise=>{const change=p.analysis!.recommendations.find(r=>r.exerciseId===exercise.id);return <View key={exercise.id} style={[s.divider,{paddingTop:12}]}><Pressable accessibilityRole="button" accessibilityLabel={`Détail pour ${exercise.name}`} onPress={()=>setDetail(detail===exercise.id?null:exercise.id)} style={s.row}><Illustration name={exercise.icon} size={37}/><View style={s.grow}><Text style={s.label}>{exercise.name}</Text><Text style={s.body}>{change?`${change.weight} kg · ${change.targetReps} reps`:'Charge à calibrer'}</Text></View><Symbol name="chevron" size={18} color="textMuted"/></Pressable>{detail===exercise.id?<Text style={[s.body,{marginTop:10}]}>{change?.reason}</Text>:null}</View>;})}</>}</Card>
    <Button text="Données utilisées" leading={<Symbol name="clipboard" color="textMuted" />} trailing={<Symbol name="chevron" color="textMuted" />} variant="secondary" onPress={() => setDataVisible(!dataVisible)} />
    {dataVisible ? <Card><Text style={s.body}>Charges, répétitions, ressenti des séries et douleurs du bilan. Énergie : {p.debrief.energy}/5. Les données sont conservées avec la séance.</Text></Card> : null}
    <Text style={s.caption}>Bilan fondé sur tes performances enregistrées.</Text>
    {p.coachApplied ? <Text style={s.link}>Consignes enregistrées pour les prochaines séances.</Text> : null}
  </>;
}
