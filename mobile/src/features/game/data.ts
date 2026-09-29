import type { IllustrationName } from '@/components/Illustration';
export type Destination = 'nutrition' | 'program' | 'checkin' | 'progression';
export type Mission = { id: string; title: string; icon: IllustrationName; xp: number; value: number; target: number; unit: string; label: string; criterion: string; destination?: Destination; cta: string; weekly?: boolean };
export const missions: Mission[] = [
  { id: 'checkin', title: 'Check-in du matin', icon: 'calendar', xp: 20, value: 1, target: 1, unit: 'check-in', label: 'Terminé', criterion: 'Compléter ton check-in du matin.', destination: 'checkin', cta: 'Voir mon check-in' },
  { id: 'protein-day', title: 'Objectif protéines', icon: 'cutlery', xp: 30, value: 137, target: 150, unit: 'g', label: '137 / 150 g', criterion: 'Atteindre ton objectif quotidien de 150 g de protéines.', destination: 'nutrition', cta: 'Voir ma nutrition' },
  { id: 'steps', title: '10 000 pas', icon: 'shoe', xp: 50, value: 8432, target: 10000, unit: 'pas', label: '8 432 / 10 000', criterion: 'Atteindre 10 000 pas dans la journée.', cta: 'Voir le suivi des pas' },
  { id: 'workout', title: 'Séance Muscu B', icon: 'dumbbell', xp: 100, value: 0, target: 1, unit: 'séance', label: 'Prévue à 18:30', criterion: 'Terminer la séance prévue dans ton programme.', destination: 'program', cta: 'Voir ma séance' },
  { id: 'sleep', title: 'Sommeil régulier', icon: 'sleep', xp: 300, value: 2, target: 4, unit: 'nuits', label: '2 / 4 nuits à 6 h minimum', criterion: 'Dormir au moins 6 heures pendant 4 nuits.', destination: 'checkin', cta: 'Voir mon check-in', weekly: true },
  { id: 'strength', title: '3 séances de musculation', icon: 'dumbbell', xp: 500, value: 3, target: 3, unit: 'séances', label: '3 / 3', criterion: 'Terminer 3 séances de musculation cette semaine.', destination: 'program', cta: 'Voir mes séances', weekly: true },
  { id: 'protein-week', title: 'Protéines', icon: 'shaker', xp: 350, value: 3, target: 5, unit: 'jours', label: '3 / 5 jours à 150 g', criterion: 'Atteindre au moins 150 g de protéines pendant 5 jours.', destination: 'nutrition', cta: 'Voir ma nutrition', weekly: true },
  { id: 'boxing', title: '2 séances de boxe', icon: 'boxing', xp: 250, value: 2, target: 2, unit: 'séances', label: '18 septembre', criterion: 'Terminer 2 séances de boxe.', destination: 'program', cta: 'Voir mes séances', weekly: true },
];
export type GamePage = { kind: 'level' | 'daily' | 'weekly' | 'streak' | 'records' | 'badges' | 'rewards' | 'levelup' } | { kind: 'mission'; id: string };
