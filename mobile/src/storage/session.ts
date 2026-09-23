import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const SESSION_KEY = 'coac-heroes.session.v1';
let token: string | null = null;
export const getSessionToken = () => token;
export async function restoreSessionToken() {
  token = Platform.OS === 'web' ? null : await SecureStore.getItemAsync(SESSION_KEY);
  return token;
}
export async function storeSessionToken(value: string | null) {
  if (Platform.OS !== 'web') {
    if (value) await SecureStore.setItemAsync(SESSION_KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    else await SecureStore.deleteItemAsync(SESSION_KEY);
  }
  token = value;
}
