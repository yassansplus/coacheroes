import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Children, createContext, useContext, useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { feedback } from '@/utils/feedback';
import { SafeAreaView } from 'react-native-safe-area-context';
import { updateHomeSummary, useHomeSummary } from '@/store/homeSummary';
import { AppHeader } from '@/components/AppHeader';
import { Banner } from '@/components/Banner';
import { BodyPainSelector, type BodyPainSelection, type BodyPainSide } from '@/components/BodyPainSelector';
import { BottomSheet } from '@/components/BottomSheet';
import { Button as SharedButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { Illustration, type IllustrationName } from '@/components/Illustration';
import { NumberStepper } from '@/components/NumberStepper';
import { ProgressBar } from '@/components/ProgressBar';
import { Symbol } from '@/components/Symbol';
import { TabSelector } from '@/components/TabSelector';
import { WeightSelectorV2 } from '@/components/WeightSelectorV2';
import { LineChart } from '@/components/charts/LineChart';
import { colors, energyLevelColors, gradients } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type Page = 'overview' | 'weight' | 'recovery' | 'adjustment';
const ReducedMotion = createContext(true);
function selectionFeedback() {
  if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined);
}
function Button(props: ComponentProps<typeof SharedButton>) {
  return <SharedButton hapticFeedback="light" {...props} />;
}
const minutesLabel = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
const weightLabel = (weight: number) => weight.toFixed(1).replace('.', ',');
const history = [78.5, 78.2, 77.9, 77.6, 77.4, 77.3, 77.5].map((value, day) => ({ day, value, label: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][day] }));

export function DailyCheckInScreen({ onFinish }: { onFinish: () => void }) {
  const homeSummary = useHomeSummary();
  const complete = () => { feedback('success'); updateHomeSummary({ sleepMinutes: sleep, energy: Number(energy), checkedIn: true }); onFinish(); };
  const [page, setPage] = useState<Page>('overview');
  const [previousPage, setPreviousPage] = useState<Page>('overview');
  const [weight, setWeight] = useState(77.5);
  const [savedWeight, setSavedWeight] = useState<number | null>(null);
  const [weightSkipped, setWeightSkipped] = useState(false);
  const [sleep, setSleep] = useState(homeSummary.sleepMinutes);
  const [quality, setQuality] = useState('2');
  const [energy, setEnergy] = useState(String(homeSummary.energy));
  const [soreness, setSoreness] = useState('light');
  const [pains, setPains] = useState<BodyPainSelection[]>([]);
  const [side, setSide] = useState<BodyPainSide>('left');
  const [painVisible, setPainVisible] = useState(false);
  const [explanationVisible, setExplanationVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let mounted = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; setReducedMotion(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted && !changed) setReducedMotion(value); }).catch(() => undefined);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  const scroll = useRef<ScrollView>(null);
  const back = useCallback(() => {
    if (painVisible) { setPainVisible(false); return; }
    if (page === 'overview') onFinish();
    else setPage(page === 'adjustment' ? previousPage : 'overview');
  }, [onFinish, page, painVisible, previousPage]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  }, [back]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page]);
  function openAdjustment() { setPreviousPage(page); setPage('adjustment'); }
  const step = page === 'overview' ? 1 : page === 'weight' ? 2 : 3;
  return <ReducedMotion.Provider value={reducedMotion}><View style={s.root}>
    <LinearGradient colors={gradients.onboarding} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={s.decoration}><LinearGradient colors={gradients.decoration} style={StyleSheet.absoluteFill} /></View>
    <SafeAreaView style={s.safe}>
      <View style={s.header}><AppHeader title={page === 'adjustment' ? 'Ajustement du jour' : 'Bilan du matin'} subtitle={page === 'adjustment' ? undefined : `${step} sur 3`}
        leading={<IconButton accessibilityLabel={page === 'overview' ? 'Fermer le bilan' : 'Retour'} variant="surface" icon={<Symbol name={page === 'overview' ? 'close' : 'back'} />} onPress={() => { selectionFeedback(); back(); }} />} />
        {page !== 'adjustment' ? <ProgressBar progress={step / 3 * 100} height={5} style={{ marginTop: 14, marginBottom: 8 }} /> : null}</View>
      <ScrollView ref={scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {page === 'overview' ? <EntranceGroup>
          <Text style={s.title}>Ton état ce matin</Text>
          <Text style={s.date}>{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          <SummaryCard icon="scale" title="Poids" value={savedWeight === null ? weightSkipped ? 'Ignoré aujourd’hui' : 'À renseigner' : `${weightLabel(savedWeight)} kg`} onPress={() => setPage('weight')} />
          <SummaryCard icon="sleep" title="Sommeil" value={minutesLabel(sleep)} subtitle="À confirmer dans ton bilan" onPress={() => setPage('recovery')} />
          <SummaryCard icon="person" title="État physique" value="Faire le point avec le coach" onPress={openAdjustment} />
          <Banner message="Fais le point sur ton état pour préparer ta séance du jour." />
          <Text style={s.caption}>Aperçu · les valeurs proposées sont des exemples modifiables.</Text>
        </EntranceGroup> : null}
        {page === 'weight' ? <EntranceGroup>
          <Text style={s.title}>Quel est ton poids ?</Text>
          <WeightSelectorV2 value={weight} onChange={setWeight} minimum={30} maximum={350} />
          <Card style={s.stack}><Text style={s.sectionTitle}>Moyenne sur 7 jours</Text>
            <View style={s.row}><Text style={s.largeValue}>77,8 <Text style={s.body}>kg</Text></Text><Text style={s.trend}>−0,3 kg ↓</Text></View>
            <LineChart data={history} accessibilityLabel="Exemple de poids sur sept jours : 78,5 ; 78,2 ; 77,9 ; 77,6 ; 77,4 ; 77,3 ; 77,5 kilogrammes." />
            <Text style={s.caption}>Historique d’exemple</Text></Card>
          <Banner message="La tendance compte plus qu’une variation quotidienne." />
        </EntranceGroup> : null}
        {page === 'recovery' ? <EntranceGroup>
          <Text style={s.title}>Récupération</Text>
          <MetricCard icon="moon" title="Durée du sommeil"><ValueBounce value={sleep}><NumberStepper label="la durée du sommeil" value={sleep} onChange={value => { selectionFeedback(); setSleep(value); }} minimum={0} maximum={1440} step={10} formatValue={minutesLabel} /></ValueBounce></MetricCard>
          <MetricCard icon="sleep" title="Qualité du sommeil">
            <TabSelector value={quality} onChange={setQuality} items={['1', '2', '3', '4', '5'].map(value => ({ value, label: value }))} />
            <Text style={s.caption}>1 · Très mauvaise    5 · Excellente</Text></MetricCard>
          <MetricCard icon="logo" title="Niveau d’énergie"><View style={s.energyRow}>{['1', '2', '3', '4', '5'].map((value, index) =>
            <EnergyChoice key={value} index={index} selected={energy === value} onPress={() => { if (energy !== value) { selectionFeedback(); setEnergy(value); } }} />)}</View>
            <Text style={s.caption}>1 · Épuisé    3 · Moyen    5 · En pleine forme</Text></MetricCard>
          <MetricCard icon="bodyweight" title="Courbatures"><TabSelector value={soreness} onChange={setSoreness} items={[{ value: 'none', label: 'Aucune' }, { value: 'light', label: 'Légères' }, { value: 'strong', label: 'Fortes' }]} /></MetricCard>
          <SummaryCard icon="target" title="Zone sensible" value={pains.length ? `${pains.length} zone(s) sélectionnée(s)` : 'Aucune · facultatif'} onPress={() => setPainVisible(true)} compact />
        </EntranceGroup> : null}
        {page === 'adjustment' ? <EntranceGroup>
          <Text style={s.title}>Ta séance, adaptée</Text>
          <Card style={[s.row, s.recovery]}><Illustration name="sleep" size={58} /><View style={s.grow}><Text style={s.eyebrow}>RÉCUPÉRATION</Text>
            <Text style={s.sectionTitle}>Sommeil : {minutesLabel(sleep)}</Text><Text style={s.body}>Énergie : {energy}/5</Text></View></Card>
          <Text style={s.sectionTitle}>Modifications proposées</Text>
          <ChangeCard icon="dumbbell" title="Volume total" before="16 séries" after="12 séries" />
          <ChangeCard icon="performance" title="Intensité" before="RIR 1–2" after="RIR 2–3" />
          <ChangeCard icon="flame" title="Finisher cardio" before="8 min" after="Retiré" removed />
          <Button text="Pourquoi ces changements ?" variant="secondary" leading={<Symbol name="info" color="primary" />} onPress={() => setExplanationVisible(value => !value)} />
          {explanationVisible ? <Entrance><Card><Text style={s.body}>Cet exemple illustre une séance allégée : moins de séries, davantage de répétitions en réserve (RIR) et aucun finisher cardio. Le coach pourra proposer un ajustement à partir de ton bilan lorsque le service sera connecté.</Text></Card></Entrance> : null}
          <Text style={s.caption}>Proposition d’exemple · aucune séance réelle n’est modifiée.</Text>
        </EntranceGroup> : null}
      </ScrollView>
      <View style={s.footer}>
        <Entrance key={page}>
        {page === 'overview' ? <><Button text="Continuer" onPress={() => setPage(savedWeight !== null || weightSkipped ? 'recovery' : 'weight')} /><Button text="Plus tard" variant="secondary" backgroundColor="transparent" onPress={onFinish} /></> : null}
        {page === 'weight' ? <><Button text="Enregistrer mon poids" onPress={() => { setSavedWeight(weight); setWeightSkipped(false); setPage('recovery'); }} />
          <Button text="Ignorer aujourd’hui" variant="secondary" backgroundColor="transparent" onPress={() => { setWeightSkipped(savedWeight === null); setPage('recovery'); }} /></> : null}
        {page === 'recovery' ? <View style={s.actions}><Button text="Terminer mon bilan" onPress={complete} style={s.grow} textStyle={s.actionText} />
          <Button text="Adapter ma séance" variant="outline" onPress={openAdjustment} style={s.grow} textStyle={s.actionText} /></View> : null}
        {page === 'adjustment' ? <><Button text="Appliquer l’ajustement" onPress={complete} /><Button text="Garder la séance initiale" variant="outline" onPress={complete} /></> : null}
        </Entrance>
      </View>
    </SafeAreaView>
    <BottomSheet visible={painVisible} onClose={() => setPainVisible(false)} title="Zones sensibles" style={{ maxHeight: '90%' }} footer={<Button text="Valider mes zones" onPress={() => setPainVisible(false)} />}>
      <ScrollView><BodyPainSelector value={pains} onChange={value => { selectionFeedback(); setPains(value); }} side={side} onSideChange={value => { selectionFeedback(); setSide(value); }} /></ScrollView>
    </BottomSheet>
  </View></ReducedMotion.Provider>;
}

function EntranceGroup({ children }: { children: ReactNode }) {
  return <View style={{ gap: 18 }}>{Children.toArray(children).map((child, index) =>
    <Entrance key={index} delay={index * 45}>{child}</Entrance>)}</View>;
}

function Entrance({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reducedMotion = useContext(ReducedMotion);
  const progress = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reducedMotion) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reducedMotion]);
  return <Animated.View style={{ gap: 10, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>{children}</Animated.View>;
}

function ValueBounce({ children, value }: { children: ReactNode; value: number }) {
  const reducedMotion = useContext(ReducedMotion);
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(value);
  useEffect(() => {
    const changed = previous.current !== value;
    previous.current = value;
    scale.stopAnimation();
    scale.setValue(1);
    if (reducedMotion || !changed) return;
    const animation = Animated.sequence([
      Animated.timing(scale, { toValue: 1.035, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [value, reducedMotion, scale]);
  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

function EnergyChoice({ index, selected, onPress }: { index: number; selected: boolean; onPress: () => void }) {
  const reducedMotion = useContext(ReducedMotion);
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const color = energyLevelColors[index];
  useEffect(() => {
    progress.stopAnimation();
    if (reducedMotion) { progress.setValue(selected ? 1 : 0); return; }
    const animation = Animated.spring(progress, { toValue: selected ? 1 : 0, friction: 5, tension: 160, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress, reducedMotion, selected]);
  return <Pressable accessibilityRole="radio" accessibilityLabel={`Énergie : ${index + 1} sur 5`} accessibilityState={{ checked: selected }}
    onPress={onPress} style={({ pressed }) => [s.energyChoice, { opacity: pressed ? 0.8 : 1 }]}>
    <Animated.View style={[s.energyBar, { height: 22 + index * 9, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: 0.25, borderRadius: 9 }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: 9,
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]} />
    </Animated.View>
    <Text style={[s.body, selected && { color, fontFamily: fontFamily.bold }]}>{index + 1}</Text>
    <View style={{ height: 5, width: 5, borderRadius: 3, backgroundColor: selected ? color : 'transparent' }} />
  </Pressable>;
}

function SummaryCard({ icon, title, value, subtitle, onPress, compact = false }: { icon: IllustrationName; title: string; value: string; subtitle?: string; onPress: () => void; compact?: boolean }) {
  const reducedMotion = useContext(ReducedMotion);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${value}`} onPress={() => { selectionFeedback(); onPress(); }}
    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed && !reducedMotion ? 0.97 : 1 }] })}><Card style={[s.row, compact ? s.compact : s.summary]}>
    <Illustration name={icon} size={compact ? 38 : 65} /><View style={s.grow}><Text style={s.sectionTitle}>{title}</Text><Text style={s.body}>{value}</Text>{subtitle ? <Text style={s.caption}>{subtitle}</Text> : null}</View>
    <Symbol name="chevron" color="textMuted" /></Card></Pressable>;
}
function MetricCard({ icon, title, children }: { icon: IllustrationName; title: string; children: ReactNode }) {
  return <Card style={s.metric}><View style={s.row}><Illustration name={icon} size={40} /><Text style={s.sectionTitle}>{title}</Text></View>{children}</Card>;
}
function ChangeCard({ icon, title, before, after, removed = false }: { icon: IllustrationName; title: string; before: string; after: string; removed?: boolean }) {
  return <Card style={s.row}><Illustration name={icon} size={52} /><View style={[s.grow, s.stack]}><Text style={s.sectionTitle}>{title}</Text>
    <View style={s.comparison}><Text style={s.before}>{before}</Text><Symbol name="arrow" color="textMuted" /><Text style={[s.after, removed && { color: colors.energy }]}>{after}</Text></View></View></Card>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, safe: { flex: 1 },
  decoration: { position: 'absolute', right: -90, top: -120, width: 280, height: 320, borderRadius: 150, overflow: 'hidden', opacity: 0.45 },
  header: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 10 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 20, gap: 18, flexGrow: 1 },
  title: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 27, textAlign: 'center', marginVertical: 12 },
  date: { color: colors.textSecondary, fontFamily: fontFamily.semiBold, fontSize: 14, textAlign: 'center', marginBottom: 12, textTransform: 'capitalize' },
  sectionTitle: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 15, flexShrink: 1 },
  body: { color: colors.textSecondary, fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 21 },
  caption: { color: colors.textMuted, fontFamily: fontFamily.regular, fontSize: 10, lineHeight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 }, grow: { flex: 1, minWidth: 0 }, stack: { gap: 12 }, summary: { minHeight: 120 }, compact: { padding: 16 }, metric: { gap: 14, padding: 18 },
  largeValue: { color: colors.text, fontFamily: fontFamily.bold, fontSize: 30 }, trend: { color: colors.success, fontFamily: fontFamily.semiBold, fontSize: 17 },
  energyRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-end' }, energyChoice: { flex: 1, alignItems: 'center', gap: 6, minHeight: 44 },
  energyBar: { width: '80%', maxWidth: 44, borderRadius: 9 }, selectedText: { color: colors.primary, fontFamily: fontFamily.bold },
  footer: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 10 }, actions: { flexDirection: 'row', gap: 10 }, actionText: { fontSize: 12, textAlign: 'center' },
  recovery: { backgroundColor: colors.accentSurface }, eyebrow: { color: colors.accent, fontFamily: fontFamily.bold, fontSize: 10, marginBottom: 8 },
  comparison: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, flexWrap: 'wrap' },
  before: { color: colors.textMuted, fontFamily: fontFamily.medium, fontSize: 16, textDecorationLine: 'line-through' }, after: { color: colors.primary, fontFamily: fontFamily.bold, fontSize: 17 },
});
