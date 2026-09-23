import { colors } from '@/theme/colors';

export const members = [
  { id: 'yassine', name: 'Yassine', initials: 'YA', level: 8, xp: 3820, actions: 12, sessions: 4, attendance: 92, streak: 7, color: colors.squadPurple, background: colors.accentSurface, weekly: [3, 3, 4, 2], planned: 13, pullups: 12, strikes: 225 },
  { id: 'sofiane', name: 'Sofiane', initials: 'SO', level: 7, xp: 3450, actions: 11, sessions: 4, attendance: 100, streak: 12, color: colors.successText, background: colors.successSurface, weekly: [2, 3, 3, 3], planned: 12, pullups: 11, strikes: 218 },
  { id: 'karim', name: 'Karim', initials: 'KA', level: 7, xp: 3110, actions: 10, sessions: 3, attendance: 86, streak: 5, color: colors.energy, background: colors.energySurface, weekly: [2, 2, 3, 3], planned: 12, pullups: 10, strikes: 202 },
  { id: 'mehdi', name: 'Mehdi', initials: 'ME', level: 6, xp: 2870, actions: 9, sessions: 3, attendance: 86, streak: 4, color: colors.warning, background: colors.warningSurface, weekly: [2, 3, 2, 3], planned: 11, pullups: 8, strikes: 190 },
] as const;
export type Member = typeof members[number];
export type MemberId = Member['id'];
export type Page = { kind: 'home' | 'challenge' | 'ranking' } | { kind: 'member' | 'compare'; member: MemberId } | { kind: 'activity'; member?: MemberId };
export const memberById = (id: MemberId) => members.find(member => member.id === id)!;
export const groupXP = members.reduce((sum, member) => sum + member.xp, 0);
export const groupSessions = members.reduce((sum, member) => sum + member.sessions, 0);
export const activities = [
  { id: 'boxing', member: 'sofiane', day: 'Aujourd’hui', time: '18:40', category: 'sessions', title: 'Séance de boxe', detail: '8 rounds', xp: 120, icon: 'boxing', tone: 'coral' },
  { id: 'challenge', member: 'yassine', day: 'Aujourd’hui', time: '17:15', category: 'sessions', title: 'Challenge collectif', detail: '+1 séance', icon: 'users', tone: 'purple' },
  { id: 'record', member: 'karim', day: 'Aujourd’hui', time: '12:30', category: 'records', title: 'Record', detail: '10 tractions', icon: 'trophy', tone: 'gold' },
  { id: 'mission', member: 'mehdi', day: 'Aujourd’hui', time: '09:10', category: 'missions', title: 'Mission protéines', detail: '5 / 5 jours', icon: 'clipboard', tone: 'green' },
  { id: 'strength', member: 'sofiane', day: 'Hier', time: '20:22', category: 'sessions', title: 'Muscu A terminée', detail: '56 min', icon: 'dumbbell', tone: 'purple' },
  { id: 'badge', member: 'karim', day: 'Hier', time: '11:08', category: 'records', title: 'Badge débloqué', detail: 'Premier mois', icon: 'trophy', tone: 'gold' },
] as const;
