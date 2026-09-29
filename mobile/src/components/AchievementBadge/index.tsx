import { useLanguage } from '@/i18n/useLanguage';
import { StyleSheet, View } from 'react-native';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';

export function AchievementBadge({ illustration, size = 128, locked = false }: { illustration: IllustrationName; size?: number; locked?: boolean }) {
  useLanguage();
  return <View style={{ width: size, maxWidth: '100%', aspectRatio: 1 }}>
    <Illustration name={illustration} size={size} style={[styles.image, locked ? styles.locked : undefined]} />
    {locked ? <View style={styles.lock}><Symbol name="lock" color="textSecondary" size={Math.max(14, size * 0.17)} /></View> : null}
  </View>;
}
const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  locked: { opacity: 0.45 },
  lock: { position: 'absolute', bottom: 0, right: 0, borderRadius: 24, padding: 6, backgroundColor: colors.border },
});
