import { useCallback, useContext, useEffect, useRef, useState, createContext } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { claimRain, feedback, releaseRain } from '@/utils/feedback';

export const MotionEnabled = createContext(true);
/** Shared clock for a group of counters, bars and rings; preserves previous values on updates. */
export function useMetricMotion(values: readonly number[], { duration = 1100, delay = 0, haptic = false, enabled = true }: { duration?: number; delay?: number; haptic?: 'rain' | 'arrival' | false; enabled?: boolean } = {}) {
  const inView = useContext(MotionEnabled);
  const [focused, setFocused] = useState(false);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  const targetKey = JSON.stringify(values.map(value => Number.isFinite(value) ? value : 0));
  const current = useRef<number[]>(values.map(() => 0));
  const [display, setDisplay] = useState(current.current);
  const lastTarget = useRef('');
  useEffect(() => {
    if (!focused || !enabled || !inView) return;
    const targets: number[] = JSON.parse(targetKey);
    const from = lastTarget.current === targetKey ? targets.map(() => 0) : targets.map((_, index) => current.current[index] ?? 0);
    lastTarget.current = targetKey;
    let alive = true, finished = false, frame = 0, start: number | undefined, pulse = 1;
    const owner = Symbol('metric');
    function update(next: number[]) { current.current = next; if (alive) setDisplay(next); }
    function finish() { if (!alive) return; finished = true; cancelAnimationFrame(frame); releaseRain(owner); update(targets); }
    update(from);
    function tick(now: number) {
      if (!alive || finished) return;
      start ??= now;
      const elapsed = now - start - delay;
      if (elapsed < 0) { frame = requestAnimationFrame(tick); return; }
      const progress = Math.min(1, elapsed / Math.max(1, duration));
      const eased = haptic === 'rain' ? progress * progress : 1 - Math.pow(1 - progress, 3);
      update(targets.map((value, index) => from[index] + (value - from[index]) * eased));
      let due = false;
      while (pulse <= 12 && elapsed >= duration * (2 * pulse / 12 - Math.pow(pulse / 12, 2))) { pulse++; due = true; }
      if (haptic === 'rain' && due && claimRain(owner)) feedback('light', owner);
      if (progress < 1) frame = requestAnimationFrame(tick);
      else { if (haptic === 'arrival') feedback('selection'); finish(); }
    }
    const app = AppState.addEventListener('change', state => { if (state !== 'active') finish(); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => { if (reduced) finish(); });
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!alive || finished) return;
      if (reduced || targets.every((value, index) => value === from[index]) || (AppState.currentState && AppState.currentState !== 'active')) finish();
      else frame = requestAnimationFrame(tick);
    }).catch(finish);
    return () => { alive = false; cancelAnimationFrame(frame); releaseRain(owner); app.remove(); motion.remove(); };
  }, [targetKey, focused, enabled, inView, duration, delay, haptic]);
  return enabled ? display : values;
}
