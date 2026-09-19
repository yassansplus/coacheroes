import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/Badge';
import { Banner } from '@/components/Banner';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { weekdays } from '@/components/WeekdaySelector';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

import { equipmentOptions, foods, sports } from '../data';
import type { OnboardingProfile } from '../types';
import { buildPreviewSchedule, foodLabel, formatMinutes } from '../utils';
import { describePain } from './ReviewStep';
import { SectionHeading, StepHeading, stepStyles as s } from './StepContent';

export function ProgramStep({ profile, completed, detailVisible, onCloseDetail, onEdit, onOpenLibrary }: {
  profile: OnboardingProfile; completed: boolean; detailVisible: boolean; onCloseDetail: () => void;
  onEdit: () => void; onOpenLibrary: () => void;
}) {
  const [adjustment, setAdjustment] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const schedule = buildPreviewSchedule(profile);
  const sessions = schedule.filter(item => item.sport);
  const selected = schedule.find(item => item.day === selectedDay);
  const nutrition: { icon: IllustrationName; value: string; label: string }[] = [
    { icon: 'flame', value: '2 350', label: 'kcal' }, { icon: 'shaker', value: '155 g', label: 'protéines' },
    { icon: 'wheat', value: '255 g', label: 'glucides' }, { icon: 'water', value: '75 g', label: 'lipides' },
  ];
  return <>
    <StepHeading title={completed ? 'Mon programme' : 'Ton programme\nest prêt'} centered />
    {completed ? <Banner variant="success" message="C’est parti ! Retrouve ta semaine et les informations de ton profil." /> : null}
    <View style={styles.week}>{schedule.map(item => <Pressable key={item.day} accessibilityRole="button"
      accessibilityLabel={`${weekdays[item.day]} : ${item.sport ? sports[item.sport].title : 'Repos'}`}
      onPress={() => setSelectedDay(item.day)} style={[styles.day, item.sport && item.sport !== 'strength' && styles.complementaryDay]}>
      <Text style={styles.dayName}>{weekdays[item.day]}</Text>
      {item.sport ? <Illustration name={sports[item.sport].icon ?? 'calendar'} size={30} /> : <Text style={styles.rest}>—</Text>}
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.daySport, !item.sport && styles.muted]}>{item.sport ? sports[item.sport].shortTitle : 'Repos'}</Text>
    </Pressable>)}</View>
    <Card style={s.section}>
      <SectionHeading title="Cette semaine" />
      <View style={styles.stats}>
        <Stat icon="calendar" value={String(sessions.length)} label="séances" />
        <View style={styles.stat}><Symbol name="clock" size={28} color="accent" /><Text style={styles.statValue}>{formatMinutes(sessions.reduce((sum, item) => sum + item.minutes, 0))}</Text><Text style={styles.statLabel}>de sport</Text></View>
        <Stat icon="sleep" value={String(7 - sessions.length)} label="jours de repos" />
      </View>
    </Card>
    <Card style={s.section}>
      <SectionHeading title="Objectif quotidien" />
      <View style={styles.stats}>{nutrition.map(item => <Stat key={item.label} {...item} compact />)}</View>
    </Card>
    <Card style={[s.section, s.row]}>
      <Illustration name="performance" size={43} /><View style={s.grow}><Text style={s.label}>Ajustement</Text>
        <Text style={s.body}>Réévaluation chaque dimanche selon tes données.</Text></View>
      <IconButton accessibilityLabel="Voir les ajustements" variant="ghost" size={30} icon={<Symbol name="chevron" color="textSecondary" />} onPress={() => setAdjustment(true)} />
    </Card>
    <View style={styles.preview}><Badge label="Aperçu" variant="neutral" /><Text style={[s.caption, s.grow]}>Programme d’exemple. Les objectifs nutritionnels sont illustratifs.</Text></View>
    {completed ? <View style={s.stack}><Button text="Modifier mon profil" variant="outline" onPress={onEdit} />
      <Button text="Bibliothèque de composants" variant="secondary" onPress={onOpenLibrary} /></View> : null}
    <BottomSheet visible={detailVisible} onClose={onCloseDetail} title="Le détail de ton programme"
      footer={<Button text="Fermer" onPress={onCloseDetail} />} style={{ maxHeight: '88%' }}>
      <ScrollView contentContainerStyle={s.stack}>
        <Text style={s.body}>Voici la répartition de ta semaine selon tes choix. Cet aperçu ne constitue pas un programme sportif ou nutritionnel personnalisé.</Text>
        {sessions.map(item => item.sport ? <View key={item.day} style={s.row}><Illustration name={sports[item.sport].icon ?? 'calendar'} size={34} />
          <View style={s.grow}><Text style={s.label}>{weekdays[item.day]} · {sports[item.sport].title}</Text><Text style={s.body}>{item.minutes} min</Text></View></View> : null)}
        <Text style={s.label}>Matériel indiqué</Text><Text style={s.body}>{profile.skippedSteps.includes(8) ? 'À définir' : profile.equipment.map(value => equipmentOptions.find(item => item.value === value)?.title ?? value).join(', ') || 'Aucun matériel précisé'}</Text>
        <Text style={s.label}>Douleurs et contraintes</Text><Text style={s.body}>{describePain(profile)}{profile.painNotes ? `\n${profile.painNotes}` : ''}</Text>
        <Text style={s.label}>Préférences alimentaires</Text><Text style={s.body}>{profile.likedFoods.map(value => foodLabel(value, foods)).join(', ') || 'Aucune préférence précisée'}</Text>
        <Text style={s.label}>À éviter</Text><Text style={s.body}>{profile.avoidedFoods.map(value => foodLabel(value, foods)).join(', ') || 'Aucune exclusion précisée'}{profile.allergies ? `\n${profile.allergies}` : ''}</Text>
      </ScrollView>
    </BottomSheet>
    <BottomSheet visible={selectedDay !== null} onClose={() => setSelectedDay(null)} title={selectedDay === null ? '' : weekdays[selectedDay]}>
      <View style={s.stack}><Text style={s.label}>{selected?.sport ? `Séance · ${sports[selected.sport].title}` : 'Journée de repos'}</Text>
        <Text style={s.body}>{selected?.sport ? `${selected.minutes} minutes prévues. Le contenu des séances sera disponible lorsque ton programme personnalisé sera connecté.` : 'Un moment pour récupérer et prendre du temps pour toi.'}</Text>
        <Button text="Fermer" onPress={() => setSelectedDay(null)} /></View>
    </BottomSheet>
    <BottomSheet visible={adjustment} onClose={() => setAdjustment(false)} title="Un programme qui évolue avec toi">
      <View style={s.stack}><Text style={s.body}>Tu peux modifier ton profil, tes disponibilités et tes préférences à tout moment. La réévaluation automatique sera disponible avec le service de coaching.</Text>
        <Button text="Modifier mon profil" onPress={() => { setAdjustment(false); onEdit(); }} />
      </View>
    </BottomSheet>
  </>;
}

function Stat({ icon, value, label, compact = false }: { icon: IllustrationName; value: string; label: string; compact?: boolean }) {
  return <View style={styles.stat}><Illustration name={icon} size={compact ? 28 : 31} />
    <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.statValue, compact && styles.compactValue]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
const styles = StyleSheet.create({
  week: { flexDirection: 'row', gap: 4, marginVertical: 12 },
  day: { flex: 1, minWidth: 0, alignItems: 'center', gap: 11, backgroundColor: colors.surface, borderRadius: 13, paddingVertical: 13, borderWidth: 1, borderColor: colors.surface },
  complementaryDay: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  dayName: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textSecondary },
  daySport: { fontFamily: fontFamily.semiBold, fontSize: 9, color: colors.text, maxWidth: '100%', paddingHorizontal: 2 }, rest: { fontSize: 23, color: colors.textMuted, height: 30 },
  muted: { color: colors.textSecondary }, stats: { flexDirection: 'row', paddingTop: 9, paddingBottom: 4 },
  stat: { flex: 1, alignItems: 'center', gap: 8, minWidth: 0, paddingHorizontal: 3 },
  statValue: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 25, textAlign: 'center' },
  compactValue: { fontSize: 18 }, statLabel: { fontFamily: fontFamily.medium, color: colors.textSecondary, fontSize: 10, textAlign: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 3 },
});
