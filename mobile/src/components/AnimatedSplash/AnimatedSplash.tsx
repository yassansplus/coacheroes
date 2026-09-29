import { useEffect, useId, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '@/components/LocalizedText';
import { appBrand } from '@/config/brand';
import { t } from '@/i18n/core';
import { useLanguage } from '@/i18n/useLanguage';
import { colors, gradients } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';

type Props = {
  ready: boolean;
  onFinish: () => void;
  /** Release the native splash only after this view and its logo are painted. */
  onPresented?: () => Promise<void>;
};

export function AnimatedSplash({ ready, onFinish, onPresented }: Props) {
  useLanguage();
  const { width, height } = useWindowDimensions();
  const size = Math.max(64, Math.min(appBrand.splashLogoSize, width - 64, height * 0.4));
  const id = useId().replace(/:/g, '');
  const [laidOut, setLaidOut] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [presented, setPresented] = useState(false);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const shine = useRef(new Animated.Value(0)).current;
  const callbacks = useRef({ onFinish, onPresented });
  callbacks.current = { onFinish, onPresented };
  const finished = useRef(false);

  useEffect(() => {
    let active = true, changed = false;
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true; if (active) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !changed) setReduced(value);
    }).catch(() => { if (active && !changed) setReduced(true); });
    return () => { active = false; listener.remove(); };
  }, []);

  useEffect(() => {
    if (!laidOut || !logoLoaded) return;
    let active = true;
    void Promise.resolve().then(() => callbacks.current.onPresented?.()).finally(() => {
      if (active) setPresented(true);
    }).catch(() => { /* The JS splash can continue when the native bridge is absent. */ });
    return () => { active = false; };
  }, [laidOut, logoLoaded]);

  useEffect(() => {
    if (!presented || reduced === null) return;
    if (reduced) {
      reveal.setValue(1); scale.setValue(1); pulse.setValue(0); shine.setValue(1);
      setIntroDone(true); return;
    }
    let active = true;
    const intro = Animated.parallel([
      Animated.timing(reveal, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 0.96, duration: 130, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.07, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(shine, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ]);
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    intro.start(result => { if (active && result.finished) setIntroDone(true); });
    breathing.start();
    return () => { active = false; intro.stop(); breathing.stop(); };
  }, [presented, reduced, pulse, reveal, scale, shine]);

  useEffect(() => {
    if (!ready || !presented || !introDone || reduced === null || finished.current) return;
    let active = true;
    const finish = () => {
      if (!active || finished.current) return;
      finished.current = true; callbacks.current.onFinish();
    };
    if (reduced) { finish(); return () => { active = false; }; }
    const exit = Animated.timing(opacity, { toValue: 0, duration: 340, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    exit.start(result => { if (result.finished) finish(); });
    return () => { active = false; exit.stop(); opacity.setValue(1); };
  }, [introDone, opacity, presented, ready, reduced]);

  return <Animated.View testID="animated-splash" style={[styles.root, { opacity }]} onLayout={() => setLaidOut(true)}
    accessibilityRole="progressbar" accessibilityLabel={t('Ouverture de Coac Heroes')} accessibilityViewIsModal>
    <StatusBar style="light" />
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: reveal }]}>
      <LinearGradient colors={gradients.splash} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`${id}blue`}><Stop offset="0" stopColor={colors.splashBlue} stopOpacity={0.65} /><Stop offset="1" stopColor={colors.splashBlue} stopOpacity={0} /></RadialGradient>
          <RadialGradient id={`${id}violet`}><Stop offset="0" stopColor={colors.splashViolet} stopOpacity={0.5} /><Stop offset="1" stopColor={colors.splashViolet} stopOpacity={0} /></RadialGradient>
        </Defs>
        <Circle cx={0} cy={height * 0.15} r={width * 0.95} fill={`url(#${id}blue)`} />
        <Circle cx={width} cy={height * 0.8} r={width * 1.15} fill={`url(#${id}violet)`} />
        <Path d={`M${-width} ${height * 0.65}L${width} ${height * 0.1}L${width} ${height * 0.21}L${-width} ${height * 0.76}Z`} fill={colors.splashBlue} opacity={0.14} />
        <Path d={`M0 ${height}L${width * 2} ${height * 0.44}L${width * 2} ${height * 0.57}L0 ${height * 1.13}Z`} fill={colors.splashViolet} opacity={0.12} />
      </Svg>
    </Animated.View>
    <View style={styles.center} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={{ position: 'absolute', width: size * 2.3, height: size * 2.3, opacity: Animated.multiply(reveal, pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] })), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.07] }) }] }}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs><RadialGradient id={`${id}halo`}><Stop offset="0" stopColor={colors.splashGold} stopOpacity={0.22} /><Stop offset="0.4" stopColor={colors.primary} stopOpacity={0.2} /><Stop offset="1" stopColor={colors.primary} stopOpacity={0} /></RadialGradient></Defs>
          <Circle cx={50} cy={50} r={50} fill={`url(#${id}halo)`} />
        </Svg>
      </Animated.View>
      <Animated.View style={{ width: size, height: size, transform: [{ scale }] }}>
        <Image source={appBrand.icon} style={styles.icon} resizeMode="contain" fadeDuration={0} onLoadEnd={() => setLogoLoaded(true)} />
        <View style={[StyleSheet.absoluteFill, styles.shineMask]}>
          <Animated.View style={{ width: size * 0.35, height: size * 1.8, position: 'absolute', top: -size * 0.4,
            opacity: shine.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 0.24, 0.24, 0] }),
            transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-size, size * 2] }) }, { rotate: '24deg' }] }}>
            <LinearGradient colors={['transparent', colors.white, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.wordmark, { top: height / 2 + size / 2 + 30, opacity: reveal, transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      <Text translate={false} style={[styles.name, { fontSize: Math.min(26, width * 0.066) }]}>COAC <Text translate={false} style={{ color: colors.splashGold }}>HEROES</Text></Text>
      <Animated.View style={[styles.dots, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] }) }]}>
        <View style={[styles.dot, { backgroundColor: colors.primary }]} /><View style={[styles.dot, { backgroundColor: colors.white }]} /><View style={[styles.dot, { backgroundColor: colors.splashGold }]} />
      </Animated.View>
    </Animated.View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, backgroundColor: appBrand.splashBackground, zIndex: 100, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  icon: { width: '100%', height: '100%' },
  shineMask: { overflow: 'hidden' },
  wordmark: { position: 'absolute', left: 24, right: 24, alignItems: 'center', gap: 22 },
  name: { color: colors.white, fontFamily: fontFamily.extraBold, letterSpacing: 3 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
