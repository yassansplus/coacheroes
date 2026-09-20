import { useCallback, useState } from 'react';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

/** Replay on Home focus or a changed total; count, bar and rain share one clock. */
export function useCalorieCount(calories: number) {
  const target = Math.max(0, Math.round(Number.isFinite(calories) ? calories : 0));
  const [display, setDisplay] = useState({ target, value: 0 });

  useFocusEffect(useCallback(() => {
    let active = true;
    let finished = false;
    let request = 0;
    let started: number | undefined;
    let pulse = 1;
    let lastPulse = -Infinity;
    const duration = 2200;
    const pulseCount = 14;
    setDisplay({ target, value: 0 });

    function finish() {
      finished = true;
      cancelAnimationFrame(request);
      if (active) setDisplay({ target, value: target });
    }
    function tick(now: number) {
      if (!active || finished) return;
      started ??= now;
      const elapsed = now - started;
      const progress = Math.min(1, elapsed / duration);
      setDisplay({ target, value: Math.round(target * progress * progress) });

      // Same accelerating rain as XP rewards. Coalesce late frames into one tap.
      let due = false;
      while (pulse <= pulseCount) {
        const ratio = pulse / pulseCount;
        if (elapsed < duration * (2 * ratio - ratio * ratio)) break;
        due = true;
        pulse++;
      }
      if (due && now - lastPulse >= 45 && Platform.OS !== 'web') {
        lastPulse = now;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
      if (progress < 1) request = requestAnimationFrame(tick);
      else finish();
    }

    const app = AppState.addEventListener('change', state => { if (state !== 'active') finish(); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => { if (reduced) finish(); });
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active || finished) return;
      if (reduced || !target || (AppState.currentState && AppState.currentState !== 'active')) finish();
      else request = requestAnimationFrame(tick);
    }).catch(() => { if (active) finish(); });

    return () => { active = false; cancelAnimationFrame(request); app.remove(); motion.remove(); };
  }, [target]));

  return display.target === target ? display.value : 0;
}
