import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme/colors';

type ProgressRingProps = { progress: number; size?: number; strokeWidth?: number; double?: boolean; children?: ReactNode };

export function ProgressRing({ progress, size = 260, strokeWidth = 12, double = false, children }: ProgressRingProps) {
  const id = useId().replace(/:/g, '');
  const value = Math.min(100, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const ring = (radius: number, opacity: number) => {
    const length = 2 * Math.PI * radius;
    return <>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.primaryTint} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={`url(#${id})`} opacity={opacity} strokeWidth={strokeWidth}
        strokeDasharray={`${length} ${length}`} strokeDashoffset={length * (1 - value / 100)} strokeLinecap="round" fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </>;
  };
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}
    style={{ width: size, height: size, alignSelf: 'center' }}>
    <Svg width={size} height={size}>
      <Defs><LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0" stopColor={colors.primary} /><Stop offset="1" stopColor={colors.accent} /></LinearGradient></Defs>
      {ring(size / 2 - strokeWidth, double ? 0.55 : 1)}
      {double ? ring(size / 2 - strokeWidth * 2.8, 1) : null}
    </Svg>
    <View style={styles.content}>{children}</View>
  </View>;
}
const styles = StyleSheet.create({ content: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' } });
