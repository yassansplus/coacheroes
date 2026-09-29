import type { IllustrationName } from './illustrations';

/** The embedded numeral denotes the artwork's rank, not the achievement target. */
export const badgeStyles = [
  { rank: 1, name: 'Bois', illustration: 'badgeWood' },
  { rank: 2, name: 'Pierre', illustration: 'badgeStone' },
  { rank: 3, name: 'Bronze', illustration: 'badgeBronze' },
  { rank: 4, name: 'Acier', illustration: 'badgeSteel' },
  { rank: 5, name: 'Argent', illustration: 'badgeSilver' },
  { rank: 6, name: 'Or', illustration: 'badgeGold' },
  { rank: 7, name: 'Émeraude', illustration: 'badgeEmerald' },
  { rank: 8, name: 'Saphir', illustration: 'badgeSapphire' },
  { rank: 9, name: 'Améthyste', illustration: 'badgeAmethyst' },
  { rank: 10, name: 'Obsidienne', illustration: 'badgeObsidian' },
] as const satisfies readonly { rank: number; name: string; illustration: IllustrationName }[];

export const badgeCatalog = {
  first_checkin: { title: 'Premier bilan', description: 'Ton premier bilan quotidien est terminé', category: 'regularity', illustration: 'badgeWood', target: 1 },
  first_workout: { title: 'Première séance', description: 'Ton premier entraînement est terminé', category: 'sport', illustration: 'badgeStone', target: 1 },
  month: { title: 'Premier mois', description: '30 bilans quotidiens terminés', category: 'regularity', illustration: 'badgeSteel', target: 30 },
  hundred: { title: '100 entraînements', description: '100 séances terminées', category: 'sport', illustration: 'badgeObsidian', target: 100 },
  pullups: { title: '10 tractions', description: '10 tractions dans une série', category: 'sport', illustration: 'badgeAmethyst', target: 10 },
  boxer: { title: 'Retour du boxeur', description: '20 séances de boxe terminées', category: 'sport', illustration: 'badgeEmerald', target: 20 },
  sleep: { title: 'Sommeil régulier', description: '30 nuits renseignées à 6 h minimum', category: 'regularity', illustration: 'badgeBronze', target: 30 },
  protein: { title: 'Protéines', description: 'Objectif protéines atteint sur 50 jours', category: 'nutrition', illustration: 'badgeSapphire', target: 50 },
} as const satisfies Record<string, { title: string; description: string; category: string; illustration: IllustrationName; target: number }>;

export type BadgeId = keyof typeof badgeCatalog;
export function isBadgeId(id: string): id is BadgeId { return Object.prototype.hasOwnProperty.call(badgeCatalog, id); }
