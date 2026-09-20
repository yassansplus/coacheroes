import type { BodyPainSelection, BodyPainSide } from '@/components/BodyPainSelector';

export type Goal = 'fat-loss' | 'muscle' | 'recomposition' | 'performance';
export type Sport = 'strength' | 'running' | 'cycling' | 'swimming' | 'walking' |
  'yoga' | 'pilates' | 'football' | 'basketball' | 'tennis' | 'padel' | 'boxing' | 'crossfit';
export type ComplementarySport = Exclude<Sport, 'strength'>;
export type PhotoView = 'front' | 'side' | 'back';
export type Performance = { id: string; label: string; value: number | null; unit: 'kg' | 'rep.' };
export type FoodSection = 'liked' | 'avoided';
export type FoodInputs = Record<FoodSection, string>;

export type OnboardingProfile = {
  goal: Goal[];
  age: string;
  height: string;
  weight: string;
  gender: string;
  level: string | null;
  performances: Performance[];
  sports: Sport[];
  places: string[];
  days: number[];
  sessions: number;
  timeOfDay: string;
  duration: string;
  gymType: string | null;
  equipment: string[];
  painSide: BodyPainSide;
  pains: BodyPainSelection[];
  painNotes: string;
  noPain: boolean;
  sleep: number;
  activity: string;
  steps: number;
  meals: string;
  cooking: string;
  restaurants: string;
  tracking: ('none' | 'calories' | 'macros')[];
  likedFoods: string[];
  avoidedFoods: string[];
  allergies: string;
  photos: Partial<Record<PhotoView, string>>;
  measurements: { waist: string; chest: string; arms: string; thighs: string };
  skippedSteps: number[];
};

export type StepProps = { profile: OnboardingProfile; update: (patch: Partial<OnboardingProfile>) => void };
