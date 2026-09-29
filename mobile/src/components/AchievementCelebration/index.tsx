import { Text } from '@/components/LocalizedText';
import { localizeLabel } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AchievementBadge } from '@/components/AchievementBadge';
import { AppModal } from '@/components/AppModal';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import type { IllustrationName } from '@/components/Illustration';
import { Motion, RewardBurst } from '@/components/Motion';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type Props = { visible: boolean; title: string; description: string; illustration: IllustrationName; onClose: () => void };

/** Controlled celebration: the caller owns unlocks, persistence and the queue. */
export function AchievementCelebration({ visible, title, description, illustration, onClose }: Props) {
  useLanguage();
  const { width, height } = useWindowDimensions();
  const artSize = Math.min(288, Math.max(120, width - 104), height * 0.36);
  return <AppModal aboveAll visible={visible} onClose={onClose} style={[styles.dialog, { maxHeight: height * 0.9 }]}
    actions={<Button text="Continuer" onPress={onClose} hapticFeedback="light" radius="100%" containerStyle={styles.button} />}>
    <View style={styles.close}><IconButton variant="ghost" size={36} accessibilityLabel={localizeLabel("Fermer le badge débloqué")} icon={<Symbol name="close" />} onPress={onClose} /></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <Badge label="Nouveau badge débloqué" style={{ alignSelf: 'center' }} />
      {visible ? <Motion key={title} pop style={{ width: artSize, height: artSize, alignItems: 'center', justifyContent: 'center' }}>
        <View pointerEvents="none" style={[styles.halo, { width: artSize, height: artSize, borderRadius: artSize / 2 }]} />
        <View pointerEvents="none" style={[styles.innerHalo, { width: artSize * 0.8, height: artSize * 0.8, borderRadius: artSize / 2 }]} />
        <AchievementBadge illustration={illustration} size={artSize * 0.94} />
        <RewardBurst />
      </Motion> : null}
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.saved}>Ajouté à ta collection</Text>
    </ScrollView>
  </AppModal>;
}
const styles = StyleSheet.create({
  dialog: { backgroundColor: colors.onboardingBackground, borderRadius: 30 },
  close: { alignItems: 'flex-end', marginTop: -10, marginRight: -10 },
  content: { alignItems: 'center', gap: 14, paddingBottom: 4 },
  halo: { position: 'absolute', backgroundColor: colors.accentSurface },
  innerHalo: { position: 'absolute', backgroundColor: colors.primaryTint },
  title: { color: colors.text, fontFamily: fontFamily.extraBold, fontSize: 26, textAlign: 'center' },
  description: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 13, textAlign: 'center' },
  saved: { color: colors.successText, fontFamily: fontFamily.semiBold, fontSize: 11, textAlign: 'center' },
  button: { flex: 1 },
});
