import type { GameProgress } from '@/store/gameProgress';
import type { Mission } from './data';

export function gameMissions(game: GameProgress): Mission[] {
  const daily = game.missions.daily, weekly = game.missions.weekly;
  const planTarget = Math.max(weekly.plan.target, 1);
  return [
    { id: 'checkin', title: 'Bilan du jour', icon: 'calendar', xp: 20, value: Number(daily.checkin), target: 1,
      unit: 'bilan', label: daily.checkin ? 'Terminé' : 'À faire', criterion: 'Terminer ton bilan quotidien.', destination: 'checkin', cta: 'Voir mon bilan' },
    { id: 'meals', title: 'Repas enregistrés', icon: 'cutlery', xp: 20, value: daily.meals, target: 2,
      unit: 'repas', label: `${daily.meals} / 2`, criterion: 'Enregistrer jusqu’à deux repas aujourd’hui, 10 XP chacun.', destination: 'nutrition', cta: 'Voir ma nutrition' },
    { id: 'workout', title: 'Séance du programme', icon: 'dumbbell', xp: 100, value: Number(daily.workout), target: 1,
      unit: 'séance', label: daily.workout ? 'Terminée' : 'À faire', criterion: 'Terminer une séance prévue dans ton programme.', destination: 'program', cta: 'Voir mes séances' },
    { id: 'weekly-plan', title: 'Suivre mon programme', icon: 'dumbbell', xp: 80, value: weekly.plan.completed, target: planTarget,
      unit: 'séances', label: `${weekly.plan.completed} / ${weekly.plan.target}`, criterion: 'Terminer au moins 80 % des séances prévues cette semaine.', destination: 'program', cta: 'Voir mon programme', weekly: true },
    { id: 'weekly-checkins', title: 'Quatre bilans', icon: 'calendar', xp: 40, value: weekly.checkins.completed, target: 4,
      unit: 'bilans', label: `${weekly.checkins.completed} / 4`, criterion: 'Terminer ton bilan quotidien quatre jours cette semaine.', destination: 'checkin', cta: 'Voir mon bilan', weekly: true },
  ];
}
