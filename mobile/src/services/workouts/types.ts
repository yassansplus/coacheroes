import type { IllustrationName } from '@/components/Illustration';
import type { BodyPainSelection } from '@/components/BodyPainSelector';

export type Feeling = 'easy' | 'correct' | 'hard' | 'failure';
export type LoggedSet = { id?: string; occurredAt?: string; updatedAt?: string; weight: number; reps: number; feeling: Feeling | null; warmup: boolean };
export type Exercise = {
  id: string; name: string; muscle: string; equipment: string; icon: IllustrationName;
  rir?: number; guidance?: string; progression?: string;
  weight: number; minReps: number; maxReps: number; targetReps: number; restSeconds: number;
  sets: (LoggedSet | null)[]; previous: { weight: number; reps: number[]; recordWeight?: number; recordReps?: number };
};
export type Workout = { programVersionId?: string; sessionIndex?: number; week?: number; scheduledDate?: string; sport?: string; id: string; name: string; description: string; minutes: number; day: number; icon: IllustrationName; kind: 'strength' | 'free'; generated?: boolean; sportBlocks?: { title: string; minutes: number; intensity: 'easy' | 'moderate' | 'hard'; instruction: string }[]; prescribedExercises?: Exercise[]; warmupMinutes?: number; warmupGuidance?: string };
export type PainReport = { id?: string; occurredAt?: string; exerciseId: string; zones: BodyPainSelection[]; intensity: number; timing: string; note: string };
export type Debrief = { energy: string; difficulty: string; pain: boolean; comment: string };

export type WorkoutSnapshot = { workout: Workout; exercises: Exercise[]; startedAt: number; endedAt: number | null; status: 'in_progress'|'completed'|'abandoned'; timezone: string; debrief: Debrief; painReports: PainReport[];
 sportMetrics: {durationSeconds:number|null;distanceMeters:number|null;rounds:number|null;intensity:'easy'|'moderate'|'hard'|null};
 resume: {page:'warmup'|'training'|'rest'|'debrief'|'summary'|'coach';exerciseIndex:number;deadline:number|null;timerDuration:number;rir:number;autoRest:boolean;guidedWarmup:boolean;restHaptics:boolean} };
export type WorkoutRecord = { id:string;revision:number;status:WorkoutSnapshot['status'];snapshot:WorkoutSnapshot;startedAt:string;endedAt:string|null;summary:{volume:number;sets:number;durationSeconds:number;pain:boolean} };
export type ExerciseHistoryEntry = {record?:{weight:number;reps:number}|null;sessionId:string;startedAt:string;endedAt:string|null;exercise:Exercise;debrief:Debrief;pain:boolean;next?:{weight:number;targetReps:number;reason:string}|null};
export type BlockProgress = {id:string;currentWeek:number;weeks:number;due:boolean;recommendation:'continue'|'renew'|'review_restrictions';completed:number;abandoned:number;volume:number;durationSeconds:number;pain:boolean;occurrences:{week:number;sessionIndex:number;date:string;status:string}[]};

export type WorkoutAnalysis={sourceRevision:number;reply:string;recommendations:{exerciseId:string;weight:number;targetReps:number;reason:string}[]};
