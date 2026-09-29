import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/LocalizedText';
import { Symbol } from '@/components/Symbol';
import { colors, gradients } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import type { HomeWidgetSnapshot } from '@/services/widgets/model';

/** Visual companion to the native widget, available in Expo Go and on web. */
export function HomeWidgetPreview({ snapshot: p, large = false }: { snapshot: HomeWidgetSnapshot; large?: boolean }) {
  return <View testID="home-widget-preview" style={[s.widget, large && s.large]}>
    <View style={s.row}>
      <LinearGradient colors={gradients.primary} style={s.logo}><Symbol name="flash" size={13} color="white" /></LinearGradient>
      <Text translate={false} style={s.brand}>COAC HEROES</Text>
      <View style={s.spacer} />
      <Text translate={false} numberOfLines={1} style={s.today}>{p.heading}</Text>
    </View>
    <View style={[s.columns, large && { marginTop: 12 }]}>
      <View style={s.column}>
        <View style={s.row}><Symbol name="flash" size={12} color="energy" /><Text translate={false} style={s.label}>{p.caloriesLabel}</Text></View>
        <Text translate={false} numberOfLines={1} adjustsFontSizeToFit style={[s.count, large && { fontSize: 40 }]}>{p.calories}</Text>
        <Text translate={false} numberOfLines={1} adjustsFontSizeToFit style={s.label}>{p.goal}</Text>
        <View style={s.track}><View style={[s.fill, { width: `${p.progress * 100}%` }]} /></View>
        {large ? <Text translate={false} style={s.remaining}>{p.remaining}</Text> : null}
      </View>
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.workout, large && { padding: 14, gap: 12 }]}>
        <View style={s.row}><Symbol name={p.workoutDone ? 'check' : 'dumbbell'} size={12} color="white" /><Text translate={false} numberOfLines={1} adjustsFontSizeToFit style={s.workoutLabel}>{p.workoutLabel}</Text></View>
        <Text translate={false} numberOfLines={2} adjustsFontSizeToFit style={[s.workoutTitle, large && { fontSize: 16 }]}>{p.workout}</Text>
        <Text translate={false} numberOfLines={1} adjustsFontSizeToFit style={s.workoutLabel}>{p.workoutDetail}</Text>
      </LinearGradient>
    </View>
    {large ? <View style={s.spacer} /> : null}
    <View style={[s.news, large && { padding: 12, gap: 9 }]}>
      <View style={s.row}><Symbol name="users" size={12} color="squadPurple" /><Text translate={false} numberOfLines={1} adjustsFontSizeToFit style={[s.newsText, large && { fontFamily: fontFamily.bold }]}>{large ? p.squadLabel : p.news[0] || p.emptyNews}</Text><Symbol name="chevron" size={9} color="squadPurple" /></View>
      {large ? (p.news.length ? p.news : [p.emptyNews]).map((news, i) => <Text translate={false} key={i} style={s.friend}>{news}</Text>) : null}
    </View>
    {large && p.updated ? <Text translate={false} style={s.updated}>{p.updated}</Text> : null}
  </View>;
}
const s = StyleSheet.create({
  widget: { width: '100%', maxWidth: 360, alignSelf: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 24, gap: 9, borderWidth: 1, borderColor: colors.border },
  large: { minHeight: 320, padding: 16, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 }, spacer: { flex: 1 },
  logo: { padding: 5, borderRadius: 8 }, brand: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.text },
  today: { color: colors.primary, backgroundColor: colors.primarySurface, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, fontFamily: fontFamily.medium, fontSize: 9 },
  columns: { flexDirection: 'row', alignItems: 'stretch', gap: 12 }, column: { flex: 1, gap: 3 },
  label: { fontFamily: fontFamily.medium, fontSize: 9, color: colors.textSecondary }, count: { fontFamily: fontFamily.bold, fontSize: 28, color: colors.text },
  track: { height: 5, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.energySurface, marginTop: 3 }, fill: { height: '100%', backgroundColor: colors.energy, borderRadius: 4 },
  remaining: { color: colors.energy, fontFamily: fontFamily.medium, fontSize: 10, marginTop: 5 },
  workout: { flex: 1, borderRadius: 16, padding: 9, gap: 5, justifyContent: 'center' },
  workoutLabel: { color: colors.white, fontFamily: fontFamily.medium, fontSize: 9, flexShrink: 1 }, workoutTitle: { color: colors.white, fontFamily: fontFamily.bold, fontSize: 12 },
  news: { backgroundColor: colors.accentSurface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 }, newsText: { fontFamily: fontFamily.medium, color: colors.text, fontSize: 9, flex: 1 },
  friend: { fontFamily: fontFamily.medium, color: colors.textSecondary, fontSize: 11 }, updated: { fontFamily: fontFamily.medium, color: colors.textMuted, fontSize: 8 },
});
