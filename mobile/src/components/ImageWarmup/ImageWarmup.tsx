import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

type Props = { sources: readonly ImageSourcePropType[]; onReady: () => void };

/** Mount actual native images behind the splash; prefetch alone warms disk. */
export function ImageWarmup({ sources, onReady }: Props) {
  const [batch, setBatch] = useState(0);
  const completed = useRef(new Set<number>());
  const ready = useRef(false);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const finish = () => { if (!ready.current) { ready.current = true; onReadyRef.current(); } };
  useEffect(() => {
    if (!sources.length) { finish(); return; }
    const timeout = setTimeout(() => { console.warn('[images] Image warm-up timed out.'); finish(); }, 15000);
    return () => clearTimeout(timeout);
  }, [sources]);
  const settle = (index: number) => {
    if (ready.current || completed.current.has(index)) return;
    completed.current.add(index);
    if (completed.current.size === sources.length) finish();
    else if (completed.current.size >= Math.min((batch + 1) * 6, sources.length)) setBatch(batch + 1);
  };
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.hidden} collapsable={false}>
    {sources.slice(batch * 6, (batch + 1) * 6).map((source, offset) => {
      const index = batch * 6 + offset;
      return <Image key={index} source={source} fadeDuration={0} resizeMode="contain" style={styles.image}
        onLoad={() => settle(index)} onError={() => { console.warn(`[images] Failed to load asset ${index}.`); settle(index); }} />;
    })}
  </View>;
}
const styles = StyleSheet.create({ hidden: { ...StyleSheet.absoluteFill, opacity: 0 }, image: { position: 'absolute', width: 180, height: 180 } });
