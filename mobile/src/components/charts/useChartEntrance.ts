import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { claimRain, feedback, releaseRain } from '@/utils/feedback';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

/** A single timeline keeps the drawing, point reveals and haptics in sync. */
export function useChartEntrance(key: string, count: number, ready: boolean, animated = true) {
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const [frame, setFrame] = useState({ key: '', elapsed: 0, immediate: false });
  // Dense daily plots reveal small groups together instead of vibrating continuously.
  const groups = Math.min(12, count);
  const drawingDuration = count > 1 ? 850 : 0;
  const interval = 90;
  const popDuration = 180;
  const duration = drawingDuration + Math.max(0, groups - 1) * interval + popDuration;

  useEffect(() => {
    if (!ready || !count || !focused) return;
    const owner = Symbol('chart');
    let disposed = false;
    let stopped = false;
    let request = 0;
    let lastGroup = -1;
    let started: number | undefined;
    setFrame({ key, elapsed: 0, immediate: !animated });

    function finish() {
      stopped = true;
      cancelAnimationFrame(request);
      releaseRain(owner);
      if (!disposed) setFrame({ key, elapsed: duration, immediate: true });
    }
    function tick(now: number) {
      if (disposed || stopped) return;
      if (AppState.currentState !== null && AppState.currentState !== 'active') { finish(); return; }
      started ??= now;
      const elapsed = Math.min(now - started, duration);
      const group = elapsed < drawingDuration ? -1 : Math.min(groups - 1, Math.floor((elapsed - drawingDuration) / interval));
      setFrame({ key, elapsed, immediate: false });
      if (group > lastGroup) {
        lastGroup = group;
        if (claimRain(owner)) feedback('selection', owner);
      }
      if (elapsed < duration) request = requestAnimationFrame(tick);
      else releaseRain(owner);
    }
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => { if (reduced) finish(); });
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (disposed || stopped) return;
      if (reduced || !animated) finish();
      else request = requestAnimationFrame(tick);
    }).catch(finish);
    return () => { disposed = true; cancelAnimationFrame(request); releaseRain(owner); subscription.remove(); };
  }, [key, count, ready, focused, animated, groups, drawingDuration, duration]);

  const current = frame.key === key ? frame : { elapsed: 0, immediate: !animated };
  const line = current.immediate ? 1 : Math.min(1, current.elapsed / Math.max(1, drawingDuration));
  function point(index: number, total = count) {
    if (current.immediate) return { visible: true, scale: 1, opacity: 1 };
    const group = Math.min(groups - 1, Math.floor(index / Math.max(1, total) * groups));
    const age = current.elapsed - drawingDuration - group * interval;
    const progress = Math.max(0, Math.min(1, age / popDuration));
    const scale = progress < 0.65 ? 1.15 * progress / 0.65 : 1.15 - 0.15 * (progress - 0.65) / 0.35;
    return { visible: age >= 0, scale, opacity: Math.min(1, progress * 4) };
  }
  return { line, point };
}
