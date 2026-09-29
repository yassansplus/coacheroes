import { useLanguage } from '@/i18n/useLanguage';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AchievementCelebration } from '@/components/AchievementCelebration';
import { badgeCatalog, isBadgeId, type BadgeId } from '@/config/badges';
import { celebrateGameBadges } from '@/services/game';
import { readCelebratedBadges, writeCelebratedBadges } from '@/storage/game';
import { useGameProgress } from '@/store/gameProgress';
import { feedback } from '@/utils/feedback';

/** One mounted instance per account. A dismissal is retained locally until the server acknowledges it. */
export function BadgeCelebrations({ userId, paused }: { userId: string; paused: boolean }) {
  useLanguage();
  const { badges = [] } = useGameProgress();
  const [seen, setSeen] = useState<BadgeId[] | null>(null);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const writes = useRef(Promise.resolve());
  const sending = useRef(false);
  const lastHaptic = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void readCelebratedBadges(userId).then(ids => { if (active) setSeen(ids); });
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => { active = false; listener.remove(); };
  }, [userId]);

  useEffect(() => {
    if (!seen || sending.current) return;
    const pending = badges.filter(b => b.unlockedAt && !b.celebratedAt && seen.includes(b.id)).map(b => b.id);
    if (!pending.length) return;
    sending.current = true;
    void celebrateGameBadges(pending).catch(() => { /* Retry on the next game refresh; local dismissal remains effective. */ })
      .finally(() => { sending.current = false; });
  }, [badges, seen]);

  const next = seen ? badges.find(b => isBadgeId(b.id) && b.unlockedAt && !b.celebratedAt && !seen.includes(b.id)) : undefined;
  const visible = Boolean(next && foreground && !paused);
  useEffect(() => {
    if (visible && next && lastHaptic.current !== next.id) { lastHaptic.current = next.id; feedback('success'); }
  }, [visible, next?.id]);
  if (!next || !seen) return null;
  const badge = badgeCatalog[next.id];
  const close = () => {
    const updated = [...new Set([...seen, next.id])];
    setSeen(updated);
    writes.current = writes.current.catch(() => {}).then(() => writeCelebratedBadges(userId, updated)).catch(() => {});
  };
  return <AchievementCelebration visible={visible} title={badge.title} description={badge.description}
    illustration={badge.illustration} onClose={close} />;
}
