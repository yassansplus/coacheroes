import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Card } from '@/components/Card';
import { Illustration } from '@/components/Illustration';
import { ProgressRing } from '@/components/ProgressRing';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

import { StepHeading, stepStyles as s } from './StepContent';

const phases = ['Profil analysé', 'Contraintes prises en compte', 'Répartition des séances', 'Calcul des calories et macros'];

export function GenerationStep({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const { width } = useWindowDimensions();
  useEffect(() => {
    // Intentional local animation for the frontend preview, with no remote request.
    const started = Date.now();
    const interval = setInterval(() => setProgress(Math.min(100, Math.round((Date.now() - started) / 45))), 45);
    const done = setTimeout(onDone, 4900);
    return () => { clearInterval(interval); clearTimeout(done); };
  }, [onDone]);
  return <View style={styles.container}>
    <StepHeading title={'Création de ton\nprogramme'} centered />
    <ProgressRing progress={progress} size={Math.min(280, width - 70)} double>
      <Illustration name="brain" size={85} />
      <Text style={styles.percentage}>{progress} %</Text>
    </ProgressRing>
    <View style={s.stack}>{phases.map((phase, index) => {
      const done = progress >= (index + 1) * 25;
      const active = !done && progress >= index * 25;
      return <Card key={phase} style={[styles.phase, active && styles.active]}>
        <View style={[styles.status, done && styles.done]}>
          {done ? <Symbol name="check" color="white" size={22} /> : active ? <ActivityIndicator color={colors.primary} /> : <View style={styles.pending} />}
        </View><Text style={[styles.phaseText, !done && !active && styles.muted]}>{phase}</Text>
      </Card>;
    })}</View>
    <Text style={[s.body, s.center]}>Tu pourras tout modifier ensuite.</Text>
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-evenly', gap: 25, paddingBottom: 24 },
  percentage: { fontFamily: fontFamily.bold, color: colors.text, fontSize: 27 },
  phase: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 16, borderWidth: 1, borderColor: colors.surface },
  active: { backgroundColor: colors.primarySurface }, status: { height: 33, width: 33, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: colors.primary }, pending: { height: 29, width: 29, borderRadius: 15, borderWidth: 2, borderColor: colors.border },
  phaseText: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.text, flex: 1, lineHeight: 21 }, muted: { color: colors.textSecondary },
});
