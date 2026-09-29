import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { localizeLabel } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AchievementBadge } from '@/components/AchievementBadge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import type { IllustrationName } from '@/components/Illustration';
import { ProgressBar } from '@/components/ProgressBar';
import { TabSelector } from '@/components/TabSelector';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export type AchievementCollectionItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  illustration: IllustrationName;
  current: number;
  target: number;
  unlockedAt: string | null;
  date: string | null;
};

type Props = {
  items: readonly AchievementCollectionItem[];
  onBadge: (id: string) => void;
  onAll?: () => void;
  summaryIcon?: ReactNode;
};

/** Visual collection only: the caller supplies real progress or preview data. */
export function AchievementCollection({ items, onBadge, onAll, summaryIcon }: Props) {
  useLanguage();
  const [filter, setFilter] = useState('all');
  return <View style={styles.stack}>
    <Card style={styles.summary}>
      {summaryIcon ?? <AchievementBadge illustration={items.find(badge => badge.unlockedAt)?.illustration ?? 'badgeWood'} size={104} />}
      <View style={styles.grow}>
        <Text adjustsFontSizeToFit numberOfLines={1} style={styles.count}>{items.filter(badge => badge.unlockedAt).length} / {items.length}</Text>
        <Text style={styles.muted}>débloqués</Text>
      </View>
    </Card>
    <TabSelector value={filter} onChange={setFilter} items={[
      { value: 'all', label: 'Tous' }, { value: 'sport', label: 'Sport' },
      { value: 'regularity', label: 'Régularité' }, { value: 'nutrition', label: 'Nutrition' },
    ]} />
    <View style={styles.grid}>
      {items.filter(badge => filter === 'all' || badge.category === filter).map(badge => (
        <Pressable key={badge.id} accessibilityRole="button"
          accessibilityLabel={localizeLabel(`${badge.title}, ${badge.unlockedAt ? 'débloqué' : t("{p0} sur {p1}", { p0: badge.current, p1: badge.target })}`)}
          onPress={() => onBadge(badge.id)} style={styles.tile}>
          <Card style={styles.card}>
            <AchievementBadge illustration={badge.illustration} size={128} locked={!badge.unlockedAt} />
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.title}>{badge.title}</Text>
            <Text style={styles.small}>{badge.description}</Text>
            {badge.date ? <View style={styles.date}><Text style={styles.dateText}>{badge.date}</Text></View> : <>
              <Text style={styles.small}>{badge.current} / {badge.target}</Text>
              <ProgressBar style={styles.progress} height={10} progress={badge.target > 0 ? badge.current / badge.target * 100 : 0} />
            </>}
          </Card>
        </Pressable>
      ))}
    </View>
    {onAll ? <Button text="Voir tous les accomplissements" variant="outline" hapticFeedback="light" radius={24}
      onPress={onAll} style={styles.action} textStyle={styles.actionText} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: 14 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 16, borderRadius: 20 },
  grow: { flex: 1, minWidth: 0 },
  count: { color: colors.text, fontFamily: fontFamily.extraBold, fontSize: 38 },
  muted: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, minWidth: 0 },
  card: { alignItems: 'center', padding: 15, gap: 9, minHeight: 180 },
  title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 14, textAlign: 'center' },
  small: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 11, textAlign: 'center' },
  date: { backgroundColor: colors.successSurface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', maxWidth: '100%' },
  dateText: { color: colors.successText, fontFamily: fontFamily.semiBold, fontSize: 12 },
  progress: { width: '100%' },
  action: { minHeight: 46, borderColor: colors.border },
  actionText: { fontSize: 13 },
});
