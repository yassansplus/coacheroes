import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PreparationChat } from '@/components/PreparationChat';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Illustration } from '@/components/Illustration';
import { LoadingState } from '@/components/LoadingState';
import { Symbol } from '@/components/Symbol';
import type { TrainingProgram } from '@/services/trainingProgram';
import { colors, gradients } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

const phases = [ ['preparing', 'Préparation de ton profil'], ['searching', 'Recherche des exercices'], ['composing', 'Construction des séances'], ['validating', 'Vérification du programme'] ] as const;
const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export function TrainingProgramView({ program, loading, error, onRetry, onEditProfile, onOpenSession }: {
  program: TrainingProgram | null; loading: boolean; error: string | null; onRetry: () => void; onEditProfile?: () => void; onOpenSession?: (index: number) => void;
}) {
  const [opened, setOpened] = useState<number | null>(null);
  const [details, setDetails] = useState(false);
  if (loading) return <LoadingState label="Chargement de ton programme…" />;
  if (error) return <ErrorState description={error} onRetry={onRetry} />;
  if (!program) return <EmptyState title="Ton programme personnalisé" description="Construisons tes séances à partir de ton profil et de tes disponibilités." actionLabel="Créer mon programme" onAction={onRetry} />;
  if (program.status === 'needs_clarification' || program.result?.outcome === 'needs_clarification') return <PreparationChat onReady={onRetry} onEditProfile={onEditProfile} />;
  if (program.stale) return <View style={s.stack}><Banner message="Ton profil a changé depuis cette génération." /><Button text="Créer un programme avec mes nouvelles réponses" onPress={onRetry} /></View>;
  if (program.status === 'failed') return <ErrorState description={program.error ?? 'La génération a été interrompue.'} onRetry={onRetry} />;
  if (program.status === 'queued' || program.status === 'generating') return <View style={s.stack}>
    <View style={s.center}><Illustration name="brain" size={90} /><Text style={s.title}>Création de ton programme</Text></View>
    {phases.map(([key, label]) => <Card key={key} style={s.row}>{program.phase === key ? <ActivityIndicator color={colors.primary} /> : <Symbol name="clock" color="textMuted" />}<Text style={s.body}>{label}{program.phase === key ? '…' : ''}</Text></Card>)}
    <Text style={s.body}>La création de ton programme peut prendre quelques minutes. Garde cette page ouverte jusqu’à la fin.</Text>
  </View>;
  const result = program.result;
  if (!result) return <ErrorState description="Le programme est indisponible." onRetry={onRetry} />;
  const exercises = new Map(program.exercises.map(e => [e.id, e]));
  return <View style={s.stack}>
    <Card style={s.hero}>
      <LinearGradient colors={gradients.selection} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={s.row}><View style={s.status}><Symbol name="sparkles" color="primary" size={14} /><Text style={s.statusText}>TON PROGRAMME · À VALIDER</Text></View></View>
      <View style={s.row}><View style={s.grow}><Text style={s.heroTitle}>{result.title}</Text></View><Illustration name="dumbbell" size={76} /></View>
      <Text style={s.body}>{result.summary}</Text>
      <View style={s.metrics}>
        <View style={s.metric}><Symbol name="calendar" color="primary" size={18} /><View><Text style={s.metricValue}>{result.sessions.length} séances</Text><Text style={s.caption}>par semaine</Text></View></View>
        <View style={s.metricDivider} />
        <View style={s.metric}><Symbol name="target" color="accent" size={18} /><View><Text style={s.metricValue}>{result.blockWeeks} semaines</Text><Text style={s.caption}>pour avancer</Text></View></View>
      </View>
    </Card>
    <View style={s.sectionHeading}><Text style={s.title}>Ta semaine</Text><Text style={s.caption}>Un rythme fait pour toi</Text></View>
    <View style={s.week}>
      {days.map((day, weekday) => { const active = result.sessions.some(session => session.weekday === weekday); return <View key={day} accessibilityLabel={`${day} : ${active ? 'entraînement' : 'récupération'}`} style={s.weekDay}>
        <View style={[s.dayCircle, active && s.dayActive]}><Text style={[s.dayLetter, active && s.dayLetterActive]}>{day.slice(0, 1)}</Text></View>
        <View style={[s.dayDot, active && s.dayDotActive]} />
      </View>; })}
    </View>
    {result.sessions.map((session, index) => <Card key={`${session.weekday}-${index}`} style={[s.session, opened === index && s.sessionOpen]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${days[session.weekday]}, ${session.name}, ${session.estimatedMinutes} minutes`} accessibilityState={{ expanded: opened === index }} onPress={() => setOpened(opened === index ? null : index)} style={({ pressed }) => [s.sessionHeader, pressed && { opacity: 0.7 }]}>
        <View style={[s.sportIcon, session.sport && session.sport !== 'strength' && { backgroundColor: colors.energySurface }]}><Illustration name={session.sport === 'boxing' ? 'punchingBag' : session.sport === 'running' ? 'shoe' : 'dumbbell'} size={44} /></View>
        <View style={s.grow}><Text style={s.dayLabel}>{days[session.weekday]}</Text><Text style={s.label}>{session.name}</Text><View style={s.sessionMeta}><Symbol name="clock" size={12} color="textMuted" /><Text style={s.caption}>{session.estimatedMinutes} min{session.exercises.length ? ` · ${session.exercises.length} exercices` : ''}</Text></View></View>
        <View style={[s.chevron, opened === index && { transform: [{ rotate: '90deg' }] }]}><Symbol name="chevron" size={15} color="primary" /></View>
      </Pressable>
      {opened === index ? <View style={s.sessionDetails}>
        <Text style={s.label}>Échauffement · {session.warmupMinutes} min</Text><Text style={s.body}>{session.warmup}</Text>
        {(session.blocks ?? []).map((block, i) => <View key={i} style={s.exercise}><Text style={s.label}>{block.title} · {block.minutes} min</Text><Text style={s.body}>{block.instruction}</Text><Text style={s.caption}>{({ easy: 'Tranquille', moderate: 'Rythme modéré', hard: 'Soutenu' })[block.intensity]}</Text></View>)}
        {session.exercises.map((item, position) => { const source = exercises.get(item.exerciseId); return <View key={item.exerciseId} style={s.exercise}>
          <Text style={s.label}>{position + 1}. {source?.name ?? 'Exercice indisponible'}</Text>
          <Text style={s.body}>{item.sets} × {item.minReps}–{item.maxReps} répétitions · Repos {item.restSeconds} s</Text>
          <Text style={s.body}>Garde {item.rir} répétitions en réserve.</Text><Text style={s.body}>{item.guidance}</Text>{details ? <Text style={s.body}>{item.progression}</Text> : null}
          {source && details ? <><Text style={s.caption}>Source : wger · {source.translation.author || source.author} · Licence {source.translation.licenseId === source.license.id ? source.license.name : `wger n° ${source.translation.licenseId}`}</Text><Button text="Consulter la source et sa licence" variant="secondary" onPress={() => { void Linking.openURL(source.sourceUrl).catch(() => undefined); }} /></> : null}
        </View>; })}
      </View> : null}
      {onOpenSession ? <Button text="Préparer cette séance" onPress={() => onOpenSession(index)} /> : null}
    </Card>)}
    <Card style={s.advice}>
      <Pressable accessibilityRole="button" accessibilityLabel="Mes conseils pour progresser" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={s.row}>
        <View style={s.adviceIcon}><Symbol name="sparkles" size={18} color="accent" /></View><Text style={[s.label, s.grow]}>Les conseils de ton coach</Text><Symbol name={details ? 'minus' : 'plus'} size={18} color="textMuted" />
      </Pressable>
      {details ? <View style={s.stack}><Text style={s.body}>{result.progression}</Text>{result.assumptions.map((text, i) => <Text key={i} style={s.body}>{text}</Text>)}</View> : null}
    </Card>
  </View>;
}
const s = StyleSheet.create({
  stack: { gap: 14, width: '100%' }, grow: { flex: 1, minWidth: 0 },
  hero: { padding: 20, gap: 14, overflow: 'hidden' }, heroTitle: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30, color: colors.text },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 }, statusText: { fontFamily: fontFamily.semiBold, fontSize: 10, letterSpacing: 0.6, color: colors.primary },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.surface },
  metric: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }, metricValue: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.text }, metricDivider: { width: 1, height: 30, backgroundColor: colors.surface },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }, weekDay: { flex: 1, alignItems: 'center', gap: 7 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, dayActive: { backgroundColor: colors.primary },
  dayLetter: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.textMuted }, dayLetterActive: { color: colors.white }, dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' }, dayDotActive: { backgroundColor: colors.primary },
  session: { padding: 14, gap: 14, borderWidth: 1, borderColor: colors.surface }, sessionOpen: { borderColor: colors.primaryTint }, sessionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sportIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' }, dayLabel: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.primary, marginBottom: 3 }, sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  chevron: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' }, sessionDetails: { gap: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  advice: { padding: 16, gap: 14 }, adviceIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.accentSurface, alignItems: 'center', justifyContent: 'center' }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, center: { alignItems: 'center', gap: 12 },
  title: { fontFamily: fontFamily.bold, fontSize: 20, color: colors.text },
  label: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.text },
  body: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 20, color: colors.textSecondary, flexShrink: 1 },
  caption: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.textSecondary },
  exercise: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
});
