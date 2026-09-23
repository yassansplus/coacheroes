import type { LoggedSet } from '@/services/workouts/types';
export type { Feeling, LoggedSet, Exercise, Workout, PainReport, Debrief } from '@/services/workouts/types';
export type Page = 'program' | 'detail' | 'ready' | 'warmup' | 'training' | 'rest' | 'replace' | 'pain' | 'history' | 'debrief' | 'summary' | 'coach';
export type SetDraft = { exerciseId: string; setIndex: number; value: LoggedSet };
