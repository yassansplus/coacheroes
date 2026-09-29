import { getLocale } from '@/i18n/core';
import { badgeCatalog, type BadgeId } from '@/config/badges';
import type { GameBadge } from '@/services/game';

export function gameBadges(progress: readonly GameBadge[] = []) {
  return (Object.keys(badgeCatalog) as BadgeId[]).map(id => {
    const definition = badgeCatalog[id], state = progress.find(badge => badge.id === id);
    return { ...definition, id, current: state?.current ?? 0, target: state?.target ?? definition.target,
      unlockedAt: state?.unlockedAt ?? null,
      date: state?.unlockedAt ? new Date(state.unlockedAt).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' }) : null };
  });
}
