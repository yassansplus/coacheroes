import { apiRequest } from '@/services/http';
export type Prescription = { exerciseId: number; sets: number; minReps: number; maxReps: number; restSeconds: number; rir: number; guidance: string; progression: string };
export type TrainingResult = { outcome: 'ready' | 'needs_clarification'; title: string; summary: string; blockWeeks: 4;
  questions: string[]; assumptions: string[]; progression: string;
  sessions: { name: string; sport?: string; setting?: 'self' | 'club'; blocks?: { title: string; minutes: number; intensity: 'easy' | 'moderate' | 'hard'; instruction: string }[]; weekday: number; warmupMinutes: number; warmup: string; estimatedMinutes: number; exercises: Prescription[] }[] };
export type CatalogExercise = { id: number; name: string; description: string; muscles: { id: number; name: string }[]; equipment: { id: number; name: string }[]; sourceUrl: string; author: string;
  license: { id: number; name: string; url: string }; translation: { id: number; licenseId: number; author: string; authorUrl: string; sourceUrl: string; derivativeSourceUrl: string } };
export type TrainingProgram = { proposalId: string; acceptedAt: string | null; status: 'queued' | 'generating' | 'ready' | 'needs_clarification' | 'failed';
  previousBlockId?: string | null;
  phase: 'preparing' | 'searching' | 'composing' | 'validating'; sourceRevision: number; stale: boolean;
  result: TrainingResult | null; exercises: CatalogExercise[]; error: string | null; updatedAt: string };
export const loadTrainingProgram = async () => (await apiRequest<{ program: TrainingProgram | null }>('/program')).program;
export const startTrainingProgram = (retry = false, force = false) => apiRequest<TrainingProgram>('/program/generate', { method: 'POST', body: { retry, force } });

export const acceptTrainingProgram = (proposalId: string) => apiRequest<TrainingProgram>('/program/accept', { method: 'POST', body: { proposalId } });

export type RenewalAnswers = {
  goals: ('fat-loss' | 'muscle' | 'recomposition' | 'performance')[];
  sports: string[]; places: ('gym' | 'home' | 'club')[]; days: number[]; sessions: number;
  duration: '45' | '60' | '90'; timeOfDay: 'morning' | 'noon' | 'evening';
  gymType: 'full' | 'building' | 'home' | null; equipment: string[];
  schedules: { sport: string; mode: 'coach' | 'fixed'; weekdays: number[]; minutes: number | null }[];
  noPain: boolean; pains: string[]; painNotes: string; weightKg: number | null;
  effort: 'easy' | 'balanced' | 'hard'; feedback: string;
};
export type ProgramBlockSummary = {
  id: string; title: string; startedAt: string; endsAt: string; weeks: number; due: boolean; replaced?: boolean;
  planned: number; completed: number; abandoned: number; durationMinutes: number; volumeKg: number;
  painSessions: number; bySport: Record<string, number>;
  weekly: { week: number; planned: number; completed: number; painSessions: number }[];
  exercises: { id: string; name: string; sessions: number; first: { date: string; weightKg: number; reps: number }; last: { date: string; weightKg: number; reps: number } }[];
  weight: { onboardingKg: number; entries: { date: string; kg: number }[]; first: { date: string; kg: number } | null; last: { date: string; kg: number } | null;
    latestKnown: { date: string; kg: number } | null };
  recovery: { checkIns: number; sleepMinutes: number | null; energy: number | null; soreness: number };
  workouts: { id: string; startedAt: string; status: string; week: number | null; name: string; sport: string;
    summary: { volume: number; sets: number; durationSeconds: number; pain: boolean; energy?: number; difficulty?: string; comment?: string };
    exercises: { id: string; name: string; sets: { weightKg: number; reps: number; feeling: string | null }[] }[] }[];
};
export type BlockReview = { summary: ProgramBlockSummary; profileRevision: number; answers: RenewalAnswers;
  review: { answers: RenewalAnswers; submittedAt: string; analysis: unknown } | null };
export const loadProgramBlocks = () => apiRequest<{ id: string; title: string; startedAt: string; endsAt: string; weeks: number; status?: 'completed' | 'active'; replaced?: boolean }[]>('/program/blocks');
export const loadProgramBlock = (id: string) => apiRequest<BlockReview>(`/program/blocks/${encodeURIComponent(id)}`);
export const renewTrainingProgram = (blockId: string, profileRevision: number, requestId: string, answers: RenewalAnswers, regenerate = false) =>
  apiRequest<TrainingProgram>('/program/renew', { method: 'POST', body: { blockId, profileRevision, requestId, answers, regenerate } });
