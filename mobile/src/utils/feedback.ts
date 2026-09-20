import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';

let lastTap = 0;
let rainOwner: symbol | null = null;
export function claimRain(owner: symbol) { if (rainOwner && rainOwner !== owner) return false; rainOwner = owner; return true; }
export function releaseRain(owner: symbol) { if (rainOwner === owner) rainOwner = null; }
export function feedback(kind: 'selection' | 'success' | 'light' = 'selection', owner?: symbol) {
  if (Platform.OS === 'web' || (AppState.currentState && AppState.currentState !== 'active')) return;
  if (owner && rainOwner !== owner) return;
  if (!owner && kind === 'success') rainOwner = null;
  const now = Date.now();
  if (now - lastTap < (kind === 'success' ? 30 : 65)) return;
  lastTap = now;
  const result = kind === 'success' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : kind === 'light' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.selectionAsync();
  void result.catch(() => {});
}
