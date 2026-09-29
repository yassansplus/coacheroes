import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { localizeLabel } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AchievementCelebration } from '@/components/AchievementCelebration';
import { AchievementBadge } from '@/components/AchievementBadge';
import { AchievementCollection, type AchievementCollectionItem } from '@/components/AchievementCollection';
import { AppHeader } from '@/components/AppHeader';
import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { ScreenBackdrop } from '@/components/ScreenBackdrop';
import { Symbol } from '@/components/Symbol';
import { badgeCatalog, badgeStyles, isBadgeId, type BadgeId } from '@/config/badges';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { feedback } from '@/utils/feedback';

const previewValues: Record<BadgeId, number> = {
  first_checkin: 1, first_workout: 1, month: 30, hundred: 64, pullups: 10, boxer: 20, sleep: 18, protein: 42,
};
const previewBadges: AchievementCollectionItem[] = (Object.keys(badgeCatalog) as BadgeId[]).map(id => {
  const badge = badgeCatalog[id], current = previewValues[id], unlocked = current >= badge.target;
  return { ...badge, id, current, unlockedAt: unlocked ? '2026-09-12T12:00:00Z' : null, date: unlocked ? '12 sept.' : null };
});

export function BadgesPreviewScreen({ onClose }: { onClose: () => void }) {
  useLanguage();
  const [queue, setQueue] = useState<BadgeId[]>([]);
  const [artPreview, setArtPreview] = useState<(typeof badgeStyles)[number] | null>(null);
  const current = queue[0];
  const badge = artPreview ? { title: artPreview.name, description: t("Badge de rang {p0}", { p0: artPreview.rank }), illustration: artPreview.illustration }
    : current ? badgeCatalog[current] : null;
  useEffect(() => { if (current || artPreview) feedback('success'); }, [current, artPreview]);

  return <View style={styles.root}>
    <ScreenBackdrop />
    <SafeAreaView style={styles.safe}>
      <View style={styles.frame}>
        <AppHeader title="Badges" subtitle="Aperçu de la collection" style={styles.header}
          leading={<IconButton accessibilityLabel={localizeLabel("Revenir à la bibliothèque")} icon={<Symbol name="back" />} onPress={onClose} size={37} />} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Banner title="Aperçu interactif" message="Touche un badge pour jouer son animation, même s’il est verrouillé. Ces exemples ne changent pas ta collection." />
          <Button text="Jouer trois déblocages à la suite" variant="outline" onPress={() => setQueue(['first_checkin', 'first_workout', 'boxer'])} />
          <AchievementCollection items={previewBadges} onBadge={id => { if (isBadgeId(id)) setQueue([id]); }} />
          <Text accessibilityRole="header" style={styles.sectionTitle}>Les 10 styles de badges</Text>
          <View style={styles.artGrid}>
            {badgeStyles.map(art => <Pressable key={art.rank} accessibilityRole="button"
              accessibilityLabel={localizeLabel(t("Voir l’animation du badge {p0}, rang {p1}", { p0: art.name, p1: art.rank }))}
              onPress={() => setArtPreview(art)} style={styles.artTile}>
              <AchievementBadge illustration={art.illustration} size={128} />
              <Text style={styles.artName}>{art.name}</Text>
              <Text style={styles.artRank}>Rang {art.rank}</Text>
            </Pressable>)}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
    {badge ? <AchievementCelebration visible title={badge.title} description={badge.description} illustration={badge.illustration}
      onClose={() => { if (artPreview) setArtPreview(null); else setQueue(currentQueue => currentQueue.slice(1)); }} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.onboardingBackground },
  safe: { flex: 1 },
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { paddingHorizontal: 18, paddingVertical: 12 },
  content: { paddingHorizontal: 18, paddingTop: 5, paddingBottom: 28, gap: 14 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: 18, color: colors.text, marginTop: 12 },
  artGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  artTile: { flexBasis: '47%', flexGrow: 1, minWidth: 0, alignItems: 'center', padding: 15, gap: 6, backgroundColor: colors.surface, borderRadius: 24 },
  artName: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.text },
  artRank: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.textSecondary },
});
