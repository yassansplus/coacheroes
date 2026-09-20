import { useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { feedback } from '@/utils/feedback';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';

/** Local, reusable before/after image reveal. Each image keeps its full dimensions. */
export function PhotoComparison({ before, after, accessibilityLabel = 'Comparer les photos' }: { before: ImageSourcePropType; after: ImageSourcePropType; accessibilityLabel?: string }) {
  const [width, setWidth] = useState(0);
  const [fraction, setFraction] = useState(0.5);
  const current = useRef({ width: 0, fraction: 0.5 });
  current.current = { width, fraction };
  const initial = useRef(0.5);
  const centerArmed = useRef(true);
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { initial.current = current.current.fraction; },
    onPanResponderMove: (_, gesture) => {
      const next = Math.max(0.03, Math.min(0.97, initial.current + gesture.dx / Math.max(1, current.current.width)));
      if (Math.abs(next - 0.5) > 0.05) centerArmed.current = true;
      if (centerArmed.current && ((current.current.fraction - 0.5) * (next - 0.5) <= 0 || Math.abs(next - 0.5) < 0.015)) { feedback(); centerArmed.current = false; }
      current.current.fraction = next; setFraction(next);
    },
    onPanResponderTerminationRequest: () => false,
  })).current;
  return <View style={{ width: '100%', aspectRatio: 1.12, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.primarySurface }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <Image source={after} fadeDuration={0} style={StyleSheet.absoluteFill} resizeMode="cover" />
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: width * fraction, overflow: 'hidden' }}><Image source={before} fadeDuration={0} style={{ width, height: '100%' }} resizeMode="cover" /></View>
    <View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={event => setFraction(value => Math.max(0.03, Math.min(0.97, value + (event.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))))} style={{ position: 'absolute', top: 0, bottom: 0, left: width * fraction - 22, width: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.white }} /><View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}><Symbol name="back" size={14} /><Symbol name="chevron" size={14} /></View>
    </View>
  </View>;
}
