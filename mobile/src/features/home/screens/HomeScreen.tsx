import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppNavbar, type AppNavTab } from '@/components/AppNavbar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Illustration } from '@/components/Illustration';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol, type SymbolName } from '@/components/Symbol';
import type { IllustrationName } from '@/config/illustrations';
import { dailyGoals } from '@/config/dailyGoals';
import { useHomeSummary } from '@/store/homeSummary';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { useMetricMotion } from '@/hooks/useMetricMotion';

type Props = {
  onTab: (tab: AppNavTab) => void;
  onWorkout: () => void;
  onNutrition: () => void;
  onAddMeal: () => void;
  onCheckIn: () => void;
  onNotifications: () => void;
  onMissions: () => void;
  onSquad: () => void;
};
function RoundIcon({ name, glyph, background, color, size = 36 }: { name?: IllustrationName; glyph?: SymbolName; background: string; color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}>{name ? <Illustration name={name} size={size * 0.68} /> : <Symbol name={glyph ?? 'chart'} size={size * 0.55} color={color ?? colors.primary} />}</View>;
}
function Stat({ icon, children, progress, tint, animated = false }: { icon: ReactNode; children: ReactNode; progress: number; tint: readonly [string, string]; animated?: boolean }) {
  return <View style={s.row}>{icon}<View style={s.grow}><Text numberOfLines={1} adjustsFontSizeToFit style={s.statText}>{children}</Text><ProgressBar progress={progress} animated={animated} height={7} gradientColors={tint} style={{ marginTop: 7 }} /></View></View>;
}
function Action({ text, icon, color, background, onPress }: { text: string; icon: ReactNode; color: string; background: string; onPress: () => void }) {
  return <Button text={text} variant="secondary" backgroundColor={background} textColor={color} leading={icon} trailing={<Symbol name="chevron" size={14} color={color} />} onPress={onPress} hapticFeedback="light" style={{ paddingHorizontal: 8, minHeight: 42, gap: 5 }} textStyle={{ fontSize: 10 }} />;
}

export function HomeScreen({ onTab, onWorkout, onNutrition, onAddMeal, onCheckIn, onNotifications, onMissions, onSquad }: Props) {
  const summary = useHomeSummary();
  const [calories, protein, sleep, energy, xp] = useMetricMotion([summary.calories, summary.protein, summary.sleepMinutes, summary.energy, 320], { duration: 2200, haptic: 'rain' });
  const sleepMinutes = Math.round(sleep);
  const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const green = [colors.successText, colors.success] as const;
  const purple = [colors.accent, colors.primary] as const;
  const gold = [colors.warning, colors.googleYellow] as const;
  return <SafeAreaView style={s.screen}><View style={s.frame}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={[s.row, { gap: 9 }]}>
        <Illustration name="logo" size={34} />
        <View style={s.grow}><Text style={s.brand}>Fit<Text style={{ color: colors.googleBlue }}>Buddy</Text></Text><Text style={s.tagline}>Plus forts, ensemble</Text></View>
        <View><IconButton size={42} accessibilityLabel="Notifications" backgroundColor={colors.onboardingBackground} icon={<Symbol name="bell" size={23} />} onPress={onNotifications} /><View pointerEvents="none" style={s.notification} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Mon profil" onPress={() => onTab('profile')} style={s.avatar}><Illustration name="coach" size={44} /></Pressable>
      </View>
      <View style={{ marginVertical: 7 }}><Text style={s.greeting}>Bonjour Yassine</Text><Text style={s.date}>Aujourd’hui · {date.charAt(0).toUpperCase() + date.slice(1)}</Text></View>

      <Card style={s.workout}>
        <View style={[s.row, { alignItems: 'center' }]}>
          <View style={{ flex: 1.5, gap: 6 }}>
            <View style={s.badge}><Text style={s.badgeText}>SÉANCE DU JOUR</Text></View>
            <Text style={s.workoutTitle}>Muscu A</Text>
            <Text style={s.date}>Haut du corps · 60 min</Text>
          </View>
          <View style={s.heroIcon}><Illustration name="dumbbell" size={100} /></View>
        </View>
        <View style={[s.row, { gap: 6 }]}>
          <View style={s.chip}><RoundIcon name="dumbbell" background={colors.primarySurface} size={29} /><View style={s.grow}><Text style={s.chipTitle}>8 exercices</Text><Text style={s.small}>Haut du corps</Text></View></View>
          <View style={s.chip}><RoundIcon glyph="target" color={colors.success} background={colors.successSurface} size={29} /><View style={s.grow}><Text style={s.chipTitle}>Objectifs</Text><Text style={s.small}>Force & volume</Text></View></View>
        </View>
        <Button text="Commencer la séance" onPress={onWorkout} hapticFeedback="medium" trailing={<Symbol name="arrow" color="white" />} radius={16} />
      </Card>

      <View style={[s.row, { alignItems: 'stretch', gap: 9 }]}>
        <Card style={s.half}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voir mon bilan nutritionnel" onPress={onNutrition} style={s.row}><RoundIcon name="cutlery" background={colors.successSurface} size={34} /><Text numberOfLines={1} adjustsFontSizeToFit style={[s.section, s.grow]}>Nutrition</Text></Pressable>
          <Stat icon={<RoundIcon name="flame" background={colors.energySurface} size={30} />} progress={calories / dailyGoals.calories * 100} tint={green} animated={false}><Text accessibilityLabel={`${Math.round(summary.calories)} calories`} style={s.bold}>{Math.round(calories).toLocaleString('fr-FR')}</Text> / {dailyGoals.calories.toLocaleString('fr-FR')} kcal</Stat>
          <Stat icon={<RoundIcon name="salad" background={colors.successSurface} size={30} />} progress={protein / dailyGoals.protein * 100} tint={green}><Text style={s.bold}>{Math.round(protein)}</Text> / {dailyGoals.protein} g protéines</Stat>
          <Action text="Ajouter un repas" icon={<RoundIcon glyph="plus" background={colors.successSurface} color={colors.successText} size={23} />} color={colors.successText} background={colors.successSurface} onPress={onAddMeal} />
        </Card>
        <Card style={s.half}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voir ma récupération" onPress={onCheckIn} style={s.row}><RoundIcon name="moon" background={colors.accentSurface} size={34} /><Text numberOfLines={1} adjustsFontSizeToFit style={[s.section, s.grow]}>Récupération</Text></Pressable>
          <Stat icon={<RoundIcon name="sleep" background={colors.accentSurface} size={30} />} progress={sleepMinutes / 480 * 100} tint={purple}><Text style={s.bold}>{Math.floor(sleepMinutes / 60)} h {String(sleepMinutes % 60).padStart(2, '0')}</Text> sommeil</Stat>
          <Stat icon={<RoundIcon glyph="flash" color={colors.warning} background={colors.warningSurface} size={30} />} progress={energy / 5 * 100} tint={gold}><Text style={s.bold}>Énergie {Math.round(energy)}/5</Text></Stat>
          <Action text={summary.checkedIn ? 'Revoir le check-in' : 'Faire le check-in'} icon={<RoundIcon glyph="chart" background={colors.accentSurface} color={colors.accent} size={23} />} color={colors.accent} background={colors.accentSurface} onPress={onCheckIn} />
        </Card>
      </View>

      <Card style={s.level}><RoundIcon name="trophy" background={colors.warningSurface} size={49} /><View style={s.grow}>
        <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 3 }]}><Text style={s.section}>Niveau 8</Text><Text style={s.small}>{Math.round(xp)} / 500 XP</Text></View>
        <ProgressBar animated={false} progress={xp / 500 * 100} height={8} gradientColors={gold} style={{ marginVertical: 7 }} />
        <Text style={s.small}>Encore 180 XP pour atteindre le niveau 9.</Text>
      </View><Button text="Voir les missions" variant="secondary" backgroundColor={colors.warningSurface} textColor={colors.energy} onPress={onMissions} hapticFeedback leading={undefined} trailing={<Symbol name="chevron" size={12} color="energy" />} style={{ paddingHorizontal: 8, minHeight: 38, gap: 3 }} textStyle={{ fontSize: 9 }} /></Card>

      <Pressable accessibilityRole="button" accessibilityLabel="Squad : voir le challenge collectif" onPress={onSquad}>
        <Card style={[s.row, { padding: 16, gap: 12 }]}><RoundIcon glyph="users" background={colors.primarySurface} size={50} /><View style={s.grow}><Text style={s.section}>Squad</Text><Text style={[s.date, { marginTop: 2 }]}>Challenge collectif</Text><View style={[s.row, { marginTop: 8, flexWrap: 'wrap', gap: 8 }]}><View style={[s.row, { gap: 4 }]}><Illustration name="shoe" size={22} /><Text style={s.small}><Text style={s.bold}>14</Text> / 20 séances</Text></View><View style={[s.row, { gap: 4 }]}><Symbol name="calendar" size={18} color="energy" /><Text style={s.small}>3 jours restants</Text></View></View></View><Symbol name="chevron" color="textSecondary" size={18} /></Card>
      </Pressable>
    </ScrollView>
    <AppNavbar includeCoach value="today" onChange={onTab} style={{ marginHorizontal: 14, marginBottom: 5 }} />
  </View></SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  frame: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  content: { padding: 15, gap: 13, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  grow: { flex: 1, minWidth: 0 },
  brand: { fontFamily: fontFamily.extraBold, fontSize: 24, color: colors.text },
  tagline: { fontFamily: fontFamily.medium, fontSize: 9, color: colors.textSecondary },
  notification: { position: 'absolute', top: 3, right: 3, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.energy, borderWidth: 1, borderColor: colors.white },
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontFamily: fontFamily.bold, fontSize: 28, color: colors.text },
  date: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  workout: { padding: 13, gap: 13, backgroundColor: colors.onboardingBackground, borderWidth: 1, borderColor: colors.primarySurface },
  workoutTitle: { fontFamily: fontFamily.bold, fontSize: 30, color: colors.text },
  badge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.primaryTint },
  badgeText: { fontFamily: fontFamily.semiBold, fontSize: 10, color: colors.googleBlue },
  heroIcon: { width: '34%', aspectRatio: 1, maxWidth: 155, borderRadius: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySurface },
  chip: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', padding: 7, borderWidth: 1, borderColor: colors.primaryTint, borderRadius: 13 },
  chipTitle: { fontFamily: fontFamily.semiBold, fontSize: 10, color: colors.text },
  small: { fontFamily: fontFamily.medium, fontSize: 9, color: colors.textSecondary },
  section: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.text },
  half: { flex: 1, minWidth: 0, padding: 9, gap: 14, borderWidth: 1, borderColor: colors.primarySurface },
  statText: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.textSecondary },
  bold: { fontFamily: fontFamily.bold, color: colors.text, fontSize: 13 },
  level: { padding: 10, gap: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primarySurface },
});
