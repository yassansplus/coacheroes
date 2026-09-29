import { Text } from '@/components/LocalizedText';
import { useLanguage } from '@/i18n/useLanguage';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AchievementBadge } from '@/components/AchievementBadge';
import { AchievementCelebration } from '@/components/AchievementCelebration';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { badgeCatalog } from '@/config/badges';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { feedback } from '@/utils/feedback';

export function BadgesPreviewLauncher({ onOpenPage }: { onOpenPage: () => void }) {
  useLanguage();
  const [visible, setVisible] = useState(false);
  const badge = badgeCatalog.first_workout;
  return <Card style={styles.card}>
    <Text style={styles.title}>Badges et déblocages</Text>
    <Text style={styles.description}>Explore la collection et rejoue les animations de chaque badge.</Text>
    <View style={styles.art}>
      <AchievementBadge illustration="badgeWood" size={88} />
      <AchievementBadge illustration="badgeEmerald" size={88} />
      <AchievementBadge illustration="badgeObsidian" size={88} />
    </View>
    <Button text="Voir la page des badges" onPress={onOpenPage} />
    <Button text="Jouer l’animation de déblocage" variant="outline" onPress={() => { feedback('success'); setVisible(true); }} />
    <AchievementCelebration visible={visible} title={badge.title} description={badge.description}
      illustration={badge.illustration} onClose={() => setVisible(false)} />
  </Card>;
}

const styles = StyleSheet.create({
  card: { gap: 14, marginTop: 20 },
  title: { fontFamily: fontFamily.bold, fontSize: 16, color: colors.text },
  description: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 20, color: colors.textSecondary },
  art: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 },
});
