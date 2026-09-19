import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Illustration, type IllustrationName } from '@/components/Illustration';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export function StepHeading({ title, subtitle, centered = false, icon, iconSize = 108 }: {
  title: string; subtitle?: string; centered?: boolean; icon?: IllustrationName; iconSize?: number;
}) {
  return <View style={[styles.heading, icon && styles.headingRow]}>
    <View style={styles.headingCopy}>
      <Text accessibilityRole="header" style={[styles.title, centered && styles.center]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, centered && styles.center]}>{subtitle}</Text> : null}
    </View>
    {icon ? <Illustration name={icon} size={iconSize} style={styles.headingIcon} /> : null}
  </View>;
}

export function SectionHeading({ title, subtitle, icon, trailing }: {
  title: string; subtitle?: string; icon?: IllustrationName; trailing?: ReactNode;
}) {
  return <View style={styles.sectionRow}>
    {icon ? <Illustration name={icon} size={46} /> : null}
    <View style={styles.headingCopy}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>{trailing}
  </View>;
}

export const stepStyles = StyleSheet.create({
  stack: { gap: 14 }, section: { gap: 12, padding: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, half: { width: '47%', flexGrow: 1 },
  third: { width: '30%', flexGrow: 1 }, divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  body: { color: colors.textSecondary, fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 19 },
  label: { color: colors.text, fontFamily: fontFamily.semiBold, fontSize: 13, lineHeight: 18 },
  caption: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 10, lineHeight: 16 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
  grow: { flex: 1, minWidth: 0 }, hero: { alignSelf: 'center', width: '76%', height: 140 },
  link: { minHeight: 40, paddingHorizontal: 0, alignSelf: 'flex-start' },
  center: { textAlign: 'center' },
});

const styles = StyleSheet.create({
  heading: { gap: 12, marginBottom: 2 }, headingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headingCopy: { flex: 1, minWidth: 0 }, headingIcon: { width: '28%', maxWidth: 124 },
  title: { fontFamily: fontFamily.bold, fontSize: 25, lineHeight: 33, letterSpacing: -0.8, color: colors.text },
  subtitle: { fontFamily: fontFamily.regular, color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginTop: 10 },
  center: { textAlign: 'center' }, sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { fontFamily: fontFamily.bold, fontSize: 16, lineHeight: 22, color: colors.text },
  sectionSubtitle: { fontFamily: fontFamily.regular, fontSize: 11, lineHeight: 17, color: colors.textSecondary, marginTop: 3 },
});
