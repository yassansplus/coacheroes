import type { IllustrationName } from '@/components/Illustration';
import type { ComplementarySport, Goal, OnboardingProfile, Sport } from './types';

export const sports: Record<Sport, { title: string; shortTitle: string; icon?: IllustrationName }> = {
  strength: { title: 'Musculation', shortTitle: 'Muscu', icon: 'dumbbell' },
  running: { title: 'Course à pied', shortTitle: 'Course', icon: 'shoe' },
  cycling: { title: 'Vélo', shortTitle: 'Vélo' },
  swimming: { title: 'Natation', shortTitle: 'Natation' },
  walking: { title: 'Marche / randonnée', shortTitle: 'Marche', icon: 'walking' },
  yoga: { title: 'Yoga', shortTitle: 'Yoga' },
  pilates: { title: 'Pilates', shortTitle: 'Pilates' },
  football: { title: 'Football', shortTitle: 'Foot' },
  basketball: { title: 'Basketball', shortTitle: 'Basket' },
  tennis: { title: 'Tennis', shortTitle: 'Tennis' },
  padel: { title: 'Padel', shortTitle: 'Padel' },
  boxing: { title: 'Boxe', shortTitle: 'Boxe', icon: 'boxing' },
  crossfit: { title: 'Cross-training', shortTitle: 'Cross', icon: 'kettlebell' },
};
export const complementarySports = (Object.keys(sports) as Sport[])
  .filter((sport): sport is ComplementarySport => sport !== 'strength');

export const goals: { value: Goal; title: string; description: string; icon: IllustrationName }[] = [
  { value: 'fat-loss', title: 'Perdre du gras', description: 'Réduire ma masse grasse et affiner ma silhouette.', icon: 'scale' },
  { value: 'muscle', title: 'Prendre du muscle', description: 'Augmenter ma masse musculaire et gagner en force.', icon: 'dumbbell' },
  { value: 'recomposition', title: 'Recomposition', description: 'Perdre du gras tout en prenant du muscle.', icon: 'recomposition' },
  { value: 'performance', title: 'Améliorer mes performances', description: 'Être plus endurant, plus fort et progresser dans mes objectifs sportifs.', icon: 'performance' },
];
export const levels: { value: string; title: string; description: string; icon: IllustrationName }[] = [
  { value: 'beginner', title: 'Débutant', description: 'Moins de 6 mois', icon: 'shoe' },
  { value: 'intermediate', title: 'Intermédiaire', description: '6 mois à 2 ans', icon: 'dumbbell' },
  { value: 'experienced', title: 'Confirmé', description: '2 à 5 ans', icon: 'kettlebell' },
  { value: 'advanced', title: 'Avancé', description: 'Plus de 5 ans', icon: 'trophy' },
];
export const equipmentOptions: { value: string; title: string; icon: IllustrationName }[] = [
  { value: 'dumbbells', title: 'Haltères', icon: 'dumbbell' }, { value: 'barbell', title: 'Barre', icon: 'barbell' },
  { value: 'machines', title: 'Machines', icon: 'machine' }, { value: 'cables', title: 'Poulies', icon: 'pulley' },
  { value: 'bag', title: 'Sac de frappe', icon: 'punchingBag' }, { value: 'bodyweight', title: 'Poids du corps', icon: 'bodyweight' },
];
export const foods: { value: string; title: string; icon: IllustrationName; section: 'liked' | 'avoided' }[] = [
  { value: 'chicken', title: 'Poulet', icon: 'chicken', section: 'liked' },
  { value: 'rice', title: 'Riz', icon: 'rice', section: 'liked' },
  { value: 'eggs', title: 'Œufs', icon: 'eggs', section: 'liked' },
  { value: 'salmon', title: 'Saumon', icon: 'salmon', section: 'liked' },
  { value: 'pasta', title: 'Pâtes', icon: 'pasta', section: 'liked' },
  { value: 'yogurt', title: 'Yaourt', icon: 'yogurt', section: 'liked' },
  { value: 'pork', title: 'Porc', icon: 'pork', section: 'avoided' },
  { value: 'alcohol', title: 'Alcool', icon: 'alcohol', section: 'avoided' },
  { value: 'lactose', title: 'Lactose', icon: 'milk', section: 'avoided' },
  { value: 'gluten', title: 'Gluten', icon: 'wheat', section: 'avoided' },
  { value: 'peanuts', title: 'Arachides', icon: 'peanuts', section: 'avoided' },
  { value: 'none', title: 'Aucun', icon: 'none', section: 'avoided' },
];
export const activities = [
  { value: 'very-low', title: 'Très faible', description: 'Peu ou pas d’activité physique' },
  { value: 'low', title: 'Faible', description: 'Un peu d’activité (1 à 3 séances par semaine)' },
  { value: 'moderate', title: 'Modérée', description: 'Activité régulière (3 à 5 séances par semaine)' },
  { value: 'high', title: 'Élevée', description: 'Très actif(ve) (6 séances ou plus par semaine)' },
];

export function createInitialProfile(): OnboardingProfile {
  return {
    goal: [], age: '', height: '', weight: '', gender: 'male', level: null,
    performances: [
      { id: 'pushups', label: 'Pompes', value: null, unit: 'rep.' },
      { id: 'pullups', label: 'Tractions', value: null, unit: 'rep.' },
      { id: 'bench', label: 'Développé couché', value: null, unit: 'kg' },
      { id: 'squat', label: 'Squat', value: null, unit: 'kg' },
      { id: 'deadlift', label: 'Soulevé de terre', value: null, unit: 'kg' },
    ],
    sports: ['strength'], places: [], days: [0, 2, 4, 6], sessions: 4, timeOfDay: 'evening', duration: '60',
    gymType: null, equipment: [], painSide: 'right', pains: [], painNotes: '', noPain: false,
    sleep: 390, activity: 'moderate', steps: 7500, meals: '3', cooking: 'often', restaurants: '2-3',
    tracking: 'none', likedFoods: [], avoidedFoods: [], allergies: '', photos: {},
    measurements: { waist: '', chest: '', arms: '', thighs: '' }, skippedSteps: [],
  };
}
