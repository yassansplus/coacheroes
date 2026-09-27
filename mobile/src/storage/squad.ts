import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const key = (userId: string) => `coac-heroes.squad.selected.v1.${userId}`;
export async function readSelectedSquadGroup(userId: string): Promise<string | null> {
  try { return Platform.OS === 'web' ? localStorage.getItem(key(userId)) : await SecureStore.getItemAsync(key(userId)); }
  catch { return null; }
}
export async function storeSelectedSquadGroup(userId: string, groupId: string | null): Promise<void> {
  try {
    if (Platform.OS === 'web') { if (groupId) localStorage.setItem(key(userId), groupId); else localStorage.removeItem(key(userId)); }
    else if (groupId) await SecureStore.setItemAsync(key(userId), groupId);
    else await SecureStore.deleteItemAsync(key(userId));
  } catch { /* Group selection can fall back to the first available group. */ }
}
