import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { isBadgeId, type BadgeId } from '@/config/badges';

const webCursors = new Map<string, number>();
const key = (userId: string) => `coac-heroes.game.cursor.v1.${userId}`;
const badgeKey = (userId: string) => `coac-heroes.game.badges-seen.v1.${userId}`;
const webBadges = new Map<string, string>();

export async function readCelebratedBadges(userId: string): Promise<BadgeId[]> {
  try {
    let raw: string | null | undefined;
    if (Platform.OS === 'web') {
      raw = webBadges.get(userId);
      try { raw = globalThis.localStorage?.getItem(badgeKey(userId)) ?? raw; } catch { /* Use this tab's memory when browser storage is disabled. */ }
    } else raw = await SecureStore.getItemAsync(badgeKey(userId));
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is BadgeId => typeof id === 'string' && isBadgeId(id)) : [];
  } catch { return []; }
}

export async function writeCelebratedBadges(userId: string, ids: BadgeId[]) {
  const value = JSON.stringify([...new Set(ids)]);
  if (Platform.OS === 'web') {
    webBadges.set(userId, value);
    try { globalThis.localStorage?.setItem(badgeKey(userId), value); } catch { /* Memory remains available for this tab. */ }
    return;
  }
  await SecureStore.setItemAsync(badgeKey(userId), value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

export async function readGameCursor(userId: string): Promise<number | null> {
  try {
    const value = Platform.OS === 'web' ? webCursors.get(userId)?.toString() ?? null : await SecureStore.getItemAsync(key(userId));
    return value !== null && /^\d+$/.test(value) ? Number(value) : null;
  } catch { return null; }
}

export async function writeGameCursor(userId: string, cursor: number) {
  if (!Number.isSafeInteger(cursor) || cursor < 0) return;
  if (Platform.OS === 'web') { webCursors.set(userId, cursor); return; }
  await SecureStore.setItemAsync(key(userId), String(cursor), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
