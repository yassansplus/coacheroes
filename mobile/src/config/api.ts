export function apiUrl(path: string): string {
  const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!base) throw new Error('L’adresse du serveur n’est pas configurée.');
  if (!/^https:\/\//.test(base) && !(__DEV__ && /^http:\/\//.test(base))) throw new Error('Le serveur doit utiliser HTTPS.');
  return `${base}${path}`;
}
