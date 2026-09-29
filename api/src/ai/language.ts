export type Language = 'fr' | 'en' | 'nl';
export const normalizeLanguage = (value: unknown): Language => value === 'en' || value === 'nl' ? value : 'fr';

/** Trusted application preference; never infer the language from user text. */
export function responseLanguage(value: unknown): string {
  if (normalizeLanguage(value) === 'nl') return 'LANGUAGE: The user selected Dutch (nl). Write ALL user-visible text in natural Dutch (Nederlands), using informal je/jij, including replies, titles, explanations, questions and generated programme instructions. French wording and tone examples above are examples only: adapt their intent into Dutch. Preserve JSON keys, enum values, IDs, measurements, tool names and explicitly required English search queries. Do not translate or rewrite quoted user content.';
  return normalizeLanguage(value) === 'en'
    ? 'LANGUAGE: The user selected English (en). Write ALL user-visible text in natural English, including replies, titles, explanations, questions and generated programme instructions. French wording and tone examples above are examples only: adapt their intent into English. Preserve JSON keys, enum values, IDs, measurements, tool names and explicitly required English search queries. Do not translate or rewrite quoted user content.'
    : 'LANGUE : la personne a choisi le français (fr). Rédige tous les textes visibles en français naturel. Conserve les clés JSON, enums, identifiants, mesures, noms des outils et requêtes de recherche explicitement demandées en anglais. Ne réécris pas les citations de l’utilisateur.';
}
