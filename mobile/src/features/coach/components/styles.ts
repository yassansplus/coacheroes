import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.onboardingBackground },
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18 },
  content: { paddingTop: 16, paddingBottom: 22, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 27, lineHeight: 34 },
  heading: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 21, lineHeight: 28 },
  label: { color: colors.text, fontFamily: fontFamily.semiBold, fontSize: 14, lineHeight: 21 },
  body: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 20 },
  caption: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 17 },
  center: { textAlign: 'center' },
  card: { padding: 16, gap: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  footer: { gap: 9, paddingBottom: 12, paddingTop: 10 },
  link: { color: colors.primary, fontFamily: fontFamily.semiBold, fontSize: 14 },
});
