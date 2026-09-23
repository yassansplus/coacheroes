import { apiRequest } from '@/services/http';
export type Prescription = { exerciseId: number; sets: number; minReps: number; maxReps: number; restSeconds: number; rir: number; guidance: string; progression: string };
export type TrainingResult = { outcome: 'ready' | 'needs_clarification'; title: string; summary: string; blockWeeks: 4;
  questions: string[]; assumptions: string[]; progression: string;
  sessions: { name: string; sport?: string; setting?: 'self' | 'club'; blocks?: { title: string; minutes: number; intensity: 'easy' | 'moderate' | 'hard'; instruction: string }[]; weekday: number; warmupMinutes: number; warmup: string; estimatedMinutes: number; exercises: Prescription[] }[] };
export type CatalogExercise = { id: number; name: string; description: string; muscles: { id: number; name: string }[]; equipment: { id: number; name: string }[]; sourceUrl: string; author: string;
  license: { id: number; name: string; url: string }; translation: { id: number; licenseId: number; author: string; authorUrl: string; sourceUrl: string; derivativeSourceUrl: string } };
export type TrainingProgram = { proposalId: string; acceptedAt: string | null; status: 'queued' | 'generating' | 'ready' | 'needs_clarification' | 'failed';
  phase: 'preparing' | 'searching' | 'composing' | 'validating'; sourceRevision: number; stale: boolean;
  result: TrainingResult | null; exercises: CatalogExercise[]; error: string | null; updatedAt: string };
export const loadTrainingProgram = async () => (await apiRequest<{ program: TrainingProgram | null }>('/program')).program;
export const startTrainingProgram = (retry = false) => apiRequest<TrainingProgram>('/program/generate', { method: 'POST', body: { retry } });

export const acceptTrainingProgram = (proposalId: string) => apiRequest<TrainingProgram>('/program/accept', { method: 'POST', body: { proposalId } });
