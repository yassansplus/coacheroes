import { t } from '@/i18n/core';
import { Text } from '@/components/LocalizedText';
import { useLanguage } from '@/i18n/useLanguage';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Modal, Platform, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Illustration } from '@/components/Illustration';
import { Motion, RewardBurst } from '@/components/Motion';
import { getGameProgress, type GameXpEvent } from '@/services/game';
import { setMutationHandler } from '@/services/http';
import { readGameCursor, writeGameCursor } from '@/storage/game';
import { resetGameProgress, setGameProgress } from '@/store/gameProgress';
import { colors } from '@/theme/colors';
import { fontFamily } from '@/theme/typography';
import { feedback } from '@/utils/feedback';
import { useSession } from './SessionProvider';
import { BadgeCelebrations } from './BadgeCelebrations';
import { useAppStarting } from './AppStartupContext';

type Gain = { xp: number; level: number | null; key: number };
function levelFor(total: number) {
  let level = 1, remaining = total, target = 200;
  while (remaining >= target) { remaining -= target; level++; target = Math.min(1000, (level + 1) * 100); }
  return level;
}

function GainOverlay({ gain }: { gain: Gain }) {
  useLanguage();
  const insets = useSafeAreaInsets();
  const content = <View pointerEvents="none" style={[styles.overlay, { paddingTop: insets.top + 12 }]}>
    <Motion trigger={gain.key} pop style={styles.pill}>
      <Illustration name="star" size={37} />
      <View><Text accessibilityLiveRegion="polite" style={styles.xp}>+{gain.xp} XP</Text>
        <Text style={styles.caption}>{gain.level ? t("Niveau {p0} atteint !", { p0: gain.level }) : 'Bien joué !'}</Text></View>
      <RewardBurst key={gain.key} />
    </Motion>
  </View>;
  if (Platform.OS === 'ios') return <FullWindowOverlay>{content}</FullWindowOverlay>;
  if (Platform.OS === 'web') return content;
  return <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>{content}</Modal>;
}

export function GameProvider({ children }: PropsWithChildren) {
  useLanguage();
  const { user } = useSession();
  const starting = useAppStarting();
  const startingRef = useRef(starting);
  startingRef.current = starting;
  const [gain, setGain] = useState<Gain | null>(null);
  const queue = useRef<Gain[]>([]);
  const showing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playNext = useCallback(() => {
    if (startingRef.current || showing.current || !queue.current.length) return;
    showing.current = true;
    const next = queue.current.shift()!;
    setGain(next);
    feedback('success');
    timer.current = setTimeout(() => {
      setGain(null); showing.current = false;
      timer.current = setTimeout(playNext, 220);
    }, 1700);
  }, []);
  useEffect(() => { if (!starting) playNext(); }, [starting, playNext]);

  useEffect(() => {
    queue.current = []; showing.current = false; setGain(null);
    if (timer.current) clearTimeout(timer.current);
    resetGameProgress();
    if (!user) return;
    let active = true, running = false, pending = false, cursorReady = false, debounce: ReturnType<typeof setTimeout> | null = null;
    let cursor: number | null = null;
    const refresh = async () => {
      if (!active || !cursorReady) return;
      if (running) { pending = true; return; }
      running = true;
      try {
        const firstLoad = cursor === null;
        const seen: GameXpEvent[] = [];
        let response = await getGameProgress(cursor ?? undefined);
        if (!active) return;
        if (!firstLoad) seen.push(...response.events);
        while (!firstLoad && response.nextEventId < response.latestEventId && active) {
          cursor = response.nextEventId;
          response = await getGameProgress(cursor);
          if (!active) return;
          seen.push(...response.events);
        }
        cursor = response.latestEventId;
        try { await writeGameCursor(user.id, cursor); } catch { /* The in-memory cursor still prevents duplicate playback. */ }
        if (!active) return;
        if (seen.length) {
          const xp = seen.reduce((sum, event) => sum + event.xp, 0);
          const beforeLevel = levelFor(Math.max(0, response.total - xp));
          queue.current.push({ xp, level: response.level > beforeLevel ? response.level : null, key: seen.at(-1)!.id });
          playNext();
        }
        // Publish new badges after scheduling XP so the two celebrations cannot flash over each other.
        setGameProgress(response);
      } catch { /* A later mutation, app resume or poll retries without losing the cursor. */ }
      finally { running = false; if (pending && active) { pending = false; void refresh(); } }
    };
    const schedule = () => {
      if (!cursorReady) { pending = true; return; }
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => { debounce = null; void refresh(); }, 350);
    };
    setMutationHandler(schedule);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') schedule(); });
    const interval = setInterval(schedule, 30000);
    void readGameCursor(user.id).then(value => { if (active) { cursor = value; cursorReady = true; void refresh(); } });
    return () => {
      active = false; setMutationHandler(undefined); appState.remove(); clearInterval(interval);
      if (debounce) clearTimeout(debounce);
      if (timer.current) clearTimeout(timer.current);
      queue.current = []; showing.current = false;
    };
  }, [user?.id, playNext]);

  return <>{children}{gain ? <GainOverlay gain={gain} /> : null}
    {user ? <BadgeCelebrations key={user.id} userId={user.id} paused={starting || Boolean(gain)} /> : null}</>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'flex-start', zIndex: 9999 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 17, paddingVertical: 10,
    borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primaryTint,
    shadowColor: colors.primary, shadowOpacity: 0.18, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  xp: { fontFamily: fontFamily.extraBold, fontSize: 20, color: colors.primary },
  caption: { fontFamily: fontFamily.semiBold, fontSize: 10, color: colors.textSecondary },
});
