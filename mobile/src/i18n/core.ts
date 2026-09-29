import en from './en.json';
import nl from './nl.json';

export type Language = 'fr' | 'en' | 'nl';
export const languages = [{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }, { value: 'nl', label: 'Nederlands' }] as const;
let language: Language = 'fr';
const listeners = new Set<() => void>();
export const getLanguage = () => language;
export const getLocale = () => ({ fr: 'fr-FR', en: 'en-GB', nl: 'nl-NL' })[language];
export const dayInitials = () => ({ fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'], en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], nl: ['M', 'D', 'W', 'D', 'V', 'Z', 'Z'] })[language];
export const isLanguage = (value: unknown): value is Language => value === 'fr' || value === 'en' || value === 'nl';
/** Regional variants share a catalogue; unsupported device languages retain the French fallback. */
export function languageFromLocale(locale: string | undefined): Language {
  const base = locale?.trim().toLowerCase().split(/[-_@]/)[0];
  return isLanguage(base) ? base : 'fr';
}
export function subscribeLanguage(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function applyLanguage(value: Language) {
  if (value === language) return;
  language = value;
  listeners.forEach(listener => listener());
}
/** Only presentation copy is translated. Unknown/user-authored text is returned unchanged. */
export function t(text: string, values?: Record<string, unknown>, selected = language): string {
  const key = text.trim();
  const catalogue: Record<string, string> | undefined = selected === 'en' ? en : selected === 'nl' ? nl : undefined;
  const entry = catalogue && Object.prototype.hasOwnProperty.call(catalogue, key) ? catalogue[key] : undefined;
  const translated = entry === undefined ? text : text.replace(key, () => entry);
  return values ? translated.replace(/\{(\w+)\}/g, (match, key: string) => Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match) : translated;
}
export function localizeLabel(text: string): string;
export function localizeLabel(text: string | undefined): string | undefined;
export function localizeLabel(text: string | undefined) { return text === undefined ? undefined : t(text); }
