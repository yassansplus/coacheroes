import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

import { activities, goals, sports } from '../data';
import type { OnboardingProfile } from '../types';
import { formatMinutes } from '../utils';
import { StepHeading, stepStyles as s } from './StepContent';

const painLabels: Record<string, string> = { shoulder: 'épaule', elbow: 'coude', wrist: 'poignet', back: 'dos', hip: 'hanche', knee: 'genou', ankle: 'cheville', heel: 'talon', other: 'autre zone' };
export function describePain(profile: OnboardingProfile) {
  if (profile.noPain) return 'Aucune douleur signalée';
  const zones = profile.pains.map(selection => {
    const [side, area] = selection.split('_');
    return `${painLabels[area]} (${side === 'left' ? 'gauche' : 'droite'})`;
  });
  return zones.join(', ') || profile.painNotes || 'Aucune zone précisée';
}

export function ReviewStep({ profile, onEdit }: { profile: OnboardingProfile; onEdit: (step: number) => void }) {
  const [group, setGroup] = useState<'training' | 'nutrition' | null>(null);
  const sport = profile.sports.map(value => sports[value].title).join(' + ');
  const avoided = profile.avoidedFoods.filter(value => value !== 'none').length;
  const rows: { title: string; value: string; icon: IllustrationName; action: () => void }[] = [
    { title: 'Objectif', value: profile.goal.map(value => goals.find(goal => goal.value === value)?.title).filter(Boolean).join(' · ') || 'À renseigner', icon: 'target', action: () => onEdit(2) },
    { title: 'Profil', value: `${profile.age} ans · ${profile.height} cm · ${profile.weight} kg`, icon: 'person', action: () => onEdit(3) },
    { title: 'Entraînement', value: profile.skippedSteps.includes(7) ? `${sport} · disponibilités à définir` : `${sport} · ${profile.sessions} séances · ${profile.duration} min`, icon: 'dumbbell', action: () => setGroup('training') },
    { title: 'Récupération', value: profile.skippedSteps.includes(10) ? 'À renseigner' : `${formatMinutes(profile.sleep)} · activité ${activities.find(item => item.value === profile.activity)?.title.toLowerCase()}`, icon: 'moon', action: () => onEdit(10) },
    { title: 'Nutrition', value: `${profile.meals} repas · ${profile.allergies.trim() ? 'allergie / préférence précisée' : avoided ? `${avoided} exclusion${avoided > 1 ? 's' : ''}` : 'aucune allergie signalée'}`, icon: 'apple', action: () => setGroup('nutrition') },
  ];
  return <>
    <StepHeading title="Vérifie ton profil" subtitle="Tout est prêt ? Tu peux encore modifier si besoin avant de créer ton programme." />
    <View style={{ gap: 10 }}>{rows.map(row => <Card key={row.title} style={styles.summary}>
      <Illustration name={row.icon} size={49} />
      <View style={s.grow}><Text style={styles.label}>{row.title}</Text><Text style={styles.value}>{row.value}</Text></View>
      <IconButton accessibilityLabel={`Modifier ${row.title.toLowerCase()}`} backgroundColor="primarySurface" size={36}
        icon={<Symbol name="edit" size={18} color="textSecondary" />} onPress={row.action} />
    </Card>)}</View>
    <Card style={[styles.summary, { backgroundColor: profile.noPain ? colors.primarySurface : colors.warningSurface }]}>
      <Symbol name={profile.noPain ? 'check' : 'warning'} color={profile.noPain ? 'primary' : 'warning'} size={32} />
      <View style={s.grow}>{!profile.noPain ? <Text style={s.label}>Douleur signalée :</Text> : null}
        <Text style={s.body}>{describePain(profile)}</Text></View>
      <Button text="Modifier" variant="secondary" backgroundColor="transparent" textColor={colors.primary}
        onPress={() => onEdit(9)} style={{ paddingHorizontal: 0 }} textStyle={{ fontSize: 11 }} />
    </Card>
    <Button text="Modifier mes photos et mensurations" variant="secondary" backgroundColor="transparent" textColor={colors.textSecondary}
      onPress={() => onEdit(13)} textStyle={{ fontSize: 11 }} style={{ minHeight: 32 }} />
    <BottomSheet visible={group !== null} onClose={() => setGroup(null)} title={group === 'training' ? 'Modifier mon entraînement' : 'Modifier ma nutrition'}>
      <View style={s.stack}>{(group === 'training' ? [
        [4, 'Mon niveau'], [5, 'Mes performances'], [6, 'Mes sports et lieux'], [7, 'Mes disponibilités'], [8, 'Mon matériel'],
      ] as const : [[11, 'Mes habitudes alimentaires'], [12, 'Mes préférences et allergies']] as const).map(([step, label]) =>
        <Button key={step} text={label} variant="outline" onPress={() => { setGroup(null); onEdit(step); }} />)}</View>
    </BottomSheet>
  </>;
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, minHeight: 82, borderRadius: 21 },
  label: { fontFamily: fontFamily.medium, color: colors.textSecondary, fontSize: 11, marginBottom: 5 },
  value: { fontFamily: fontFamily.semiBold, color: colors.text, fontSize: 14, lineHeight: 21 },
});
