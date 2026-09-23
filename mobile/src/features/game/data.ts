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
export const badges = [
  { id: 'month', title: 'Premier mois', subtitle: '30 jours', date: '12 sept.', category: 'regularity', icon: 'calendar', current: 30, target: 30 },
  { id: 'hundred', title: '100 entraînements', subtitle: '100 séances', date: '4 sept.', category: 'sport', icon: 'dumbbell', current: 100, target: 100 },
  { id: 'pullups', title: '10 tractions', subtitle: 'Record', date: '28 août', category: 'sport', icon: 'dumbbell', current: 10, target: 10 },
  { id: 'boxer', title: 'Retour du boxeur', subtitle: '20 séances', date: '16 août', category: 'sport', icon: 'boxing', current: 20, target: 20 },
  { id: 'sleep', title: 'Sommeil régulier', subtitle: '18 / 30 nuits', date: '', category: 'regularity', icon: 'sleep', current: 18, target: 30 },
  { id: 'protein', title: 'Protéines', subtitle: '42 / 50 jours', date: '', category: 'nutrition', icon: 'shaker', current: 42, target: 50 },
] as const;
export const rewards = [
  { id: 'azur', title: 'Cadre azur', category: 'frame', requirement: 'Niveau 5', level: 5 },
  { id: 'cobalt', title: 'Cadre cobalt', category: 'frame', requirement: 'Niveau 9', level: 9 },
  { id: 'confirmed', title: 'Titre Confirmé', category: 'title', requirement: 'Niveau 8', level: 8 },
  { id: 'regular', title: 'Titre Assidu', category: 'title', requirement: 'Série de 14 jours', level: 99 },
  { id: 'light', title: 'Thème clair', category: 'theme', requirement: 'Disponible', level: 1 },
  { id: 'violet', title: 'Thème violet', category: 'theme', requirement: '5 000 XP total', level: 99 },
] as const;
export const records = [
  { id: 'pullups', title: 'Tractions', detail: '8 reps · +4 depuis le début', category: 'strength', icon: 'dumbbell' },
  { id: 'legpress', title: 'Presse à cuisses', detail: '120 kg × 10', category: 'strength', icon: 'dumbbell' },
  { id: 'bag', title: 'Sac', detail: '204 frappes en 3 min', category: 'boxing', icon: 'punchingBag' },
  { id: 'rope', title: 'Corde', detail: '7 min 10 sans arrêt', category: 'boxing', icon: 'shoe' },
] as const;
