import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.onboardingBackground },
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 14 },
  header: { paddingHorizontal: 18, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fontFamily.bold, color: colors.text, fontSize: 26 },
  heading: { fontFamily: fontFamily.bold, color: colors.text, fontSize: 19 },
  value: { fontFamily: fontFamily.bold, color: colors.text, fontSize: 26 },
  label: { fontFamily: fontFamily.semiBold, color: colors.text, fontSize: 13, lineHeight: 19 },
  body: { fontFamily: fontFamily.medium, color: colors.textSecondary, fontSize: 12, lineHeight: 18 },
  small: { fontFamily: fontFamily.medium, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ''''''''''''''''''wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  card: { padding: 16, gap: 14 },
  actions: { gap: 10, marginTop: 8 },
  tinted: { padding: 12, borderRadius: 15, backgroundColor: colors.onboardingBackground },
});
