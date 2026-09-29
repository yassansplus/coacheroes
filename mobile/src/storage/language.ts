import * as SecureStore from 'expo-secure-store';
import { Platform, Settings } from 'react-native';
import { applyLanguage, isLanguage, languageFromLocale, type Language } from '@/i18n/core';

const LANGUAGE_KEY = 'coac-heroes.language.v1';
export function deviceLanguage(): Language {
  if (Platform.OS === 'ios') {
    try {
      const preferred: unknown = Settings.get('AppleLanguages');
      if (Array.isArray(preferred) && typeof preferred[0] === 'string') return languageFromLocale(preferred[0]);
    } catch { /* Fall back to the native Intl locale. */ }
  }
  try {
    const locale = Platform.OS === 'web'
      ? globalThis.navigator?.languages?.[0] ?? globalThis.navigator?.language ?? Intl.DateTimeFormat().resolvedOptions().locale
      : Intl.DateTimeFormat().resolvedOptions().locale;
    return languageFromLocale(locale);
  } catch { return 'fr'; }
}
export async function restoreLanguage() {
  let selected = deviceLanguage();
  try {
    const value = Platform.OS === 'web' ? globalThis.localStorage?.getItem(LANGUAGE_KEY) : await SecureStore.getItemAsync(LANGUAGE_KEY);
    if (isLanguage(value)) selected = value;
  } catch { /* Use the device language when storage cannot be read. */ }
  applyLanguage(selected);
}
export async function saveLanguage(value: Language) {
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(LANGUAGE_KEY, value);
  else await SecureStore.setItemAsync(LANGUAGE_KEY, value);
  applyLanguage(value);
}
