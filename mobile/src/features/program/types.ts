import type { IllustrationName } from '@/components/Illustration';
import type { BodyPainSelection } from '@/components/BodyPainSelector';

export type Feeling = 'easy' | 'correct' | 'hard' | 'failure';
export type LoggedSet = { weight: number; reps: number; feeling: Feeling | null; warmup: boolean };
export type Exercise = {
  id: string; name: string; muscle: string; equipment: 'Machine' | 'Haltères' | 'Barre'; icon: IllustrationName;
  weight: number; minReps: number; maxReps: number; targetReps: number; restSeconds: number;
  sets: (LoggedSet | null)[]; previous: { weight: number; reps: number[] };
};
export type Workout = { id: string; name: string; description: string; minutes: number; day: number; icon: IllustrationName; kind: 'strength' | 'free' };
export type PainReport = { exerciseId: string; zones: BodyPainSelection[]; intensity: number; timing: string; note: string };
export type Debrief = { energy: string; difficulty: string; pain: boolean; comment: string };
export type Page = 'program' | 'detail' | 'ready' | 'warmup' | 'training' | 'rest' | 'replace' | 'pain' | 'history' | 'debrief' | 'summary' | 'coach';
export type SetDraft = { exerciseId: string; setIndex: number; value: LoggedSet };
