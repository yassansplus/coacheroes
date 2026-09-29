export const gameRewards = [
  { id: 'azur', title: 'Cadre azur', category: 'frame', requirement: 'Niveau 5' },
  { id: 'cobalt', title: 'Cadre cobalt', category: 'frame', requirement: 'Niveau 9' },
  { id: 'confirmed', title: 'Titre Confirmé', category: 'title', requirement: 'Niveau 8' },
  { id: 'regular', title: 'Titre Assidu', category: 'title', requirement: '14 bilans quotidiens consécutifs' },
  { id: 'light', title: 'Thème clair', category: 'theme', requirement: 'Disponible' },
  { id: 'violet', title: 'Thème violet', category: 'theme', requirement: '5 000 XP total' },
] as const;

export function equippedTitle(id: string): string | null {
  return id === 'regular' ? 'Assidu' : id === 'confirmed' ? 'Confirmé' : null;
}
