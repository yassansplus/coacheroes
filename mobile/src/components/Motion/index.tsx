import { useEffect, useRef, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, type TextProps, type StyleProp, type ViewStyle } from 'react-native';
import { useMetricMotion } from '@/hooks/useMetricMotion';
import { colors } from '@/theme/colors';

export function Motion({ children, trigger = '', delay = 0, style, pop = false }: PropsWithChildren<{ trigger?: string | number | boolean; delay?: number; style?: StyleProp<ViewStyle>; pop?: boolean }>) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true, stopped = false;
    progress.setValue(0);
    const finish = () => { stopped = true; progress.stopAnimation(); progress.setValue(1); };
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => { if (reduced) finish(); });
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!alive || stopped) return;
      if (reduced) finish();
      else Animated.timing(progress, { toValue: 1, duration: pop ? 380 : 280, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }).catch(() => { if (alive) finish(); });
    return () => { alive = false; progress.stopAnimation(); listener.remove(); };
  }, [trigger, delay, pop, progress]);
  return <Animated.View style={[style, { opacity: progress, transform: pop ? [{ scale: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.9, 1.035, 1] }) }] : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [9, 0] }) }] }]}>{children}</Animated.View>;
}

export function AnimatedMetricText({ value, delay = 0, ...props }: Omit<TextProps, 'children'> & { value: number | string; delay?: number }) {
  const text = String(value);
  const match = text.match(/[+-]?\d+(?:[ \u00a0\u202f]\d{3})*(?:[.,]\d+)?/);
  const durationMatch = text.match(/^(\d+)\s*h\s*(\d+)$/);
  const target = durationMatch ? Number(durationMatch[1]) * 60 + Number(durationMatch[2]) : match ? Number(match[0].replace(/[ \u00a0\u202f]/g, '').replace(',', '.')) : 0;
  const [count] = useMetricMotion([target], { delay, duration: 800 });
  const decimals = match?.[0].split(/[.,]/)[1]?.length ?? 0;
  const formatted = (count ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const shown = durationMatch ? `${Math.floor(Math.round(count ?? 0) / 60)} h ${String(Math.round(count ?? 0) % 60).padStart(2, '0')}` : match ? text.replace(match[0], `${match[0].startsWith('+') ? '+' : ''}${formatted}`) : text;
  return <Text {...props} accessibilityLabel={props.accessibilityLabel ?? text}>{shown}</Text>;
}

export function RewardBurst() {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let alive = true, stopped = false;
    const stop = () => { stopped = true; progress.stopAnimation(); progress.setValue(1); };
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => { if (reduced) stop(); });
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!alive || stopped) return;
      if (reduced) stop();
      else Animated.timing(progress, { toValue: 1, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }).catch(() => { if (alive) stop(); });
    return () => { alive = false; progress.stopAnimation(); listener.remove(); };
  }, [progress]);
  return <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: '45%', left: '50%' }}>
    {Array.from({ length: 12 }, (_, index) => {
      const angle = index / 12 * Math.PI * 2;
      return <Animated.View key={index} style={{ position: 'absolute', width: 6, height: 6, borderRadius: 2, backgroundColor: [colors.primary, colors.accent, colors.warning, colors.success][index % 4], opacity: progress.interpolate({ inputRange: [0, 0.1, 0.65, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 85] }) }, { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 65] }) }, { rotate: `${index * 30}deg` }] }} />;
    })}
  </Animated.View>;
}
