import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

export const styles = StyleSheet.create({
  stack: { gap: 16 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  grow: { flex: 1, minWidth: 0 }, title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 27, lineHeight: 35 },
  section: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 17, lineHeight: 24 },
  label: { color: colors.text, fontFamily: fontFamily.semiBold, fontSize: 13, lineHeight: 20 },
  body: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 19 },
  caption: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 10, lineHeight: 16 },
  value: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 28 }, center: { textAlign: 'center' },
  tile: { flexGrow: 1, flexBasis: '43%', gap: 8, padding: 18 }, compact: { padding: 16, gap: 10 },
  selected: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primarySurface },
  link: { color: colors.primary, fontFamily: fontFamily.semiBold, fontSize: 13 },
  chip: { minHeight: 0, paddingHorizontal: 9, paddingVertical: 4, gap: 5 },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  glyph: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySurface },
});
