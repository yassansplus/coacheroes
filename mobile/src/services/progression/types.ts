import type { ImageSourcePropType } from 'react-native';

export type Angle = 'face' | 'profile' | 'back';
export type MeasureKey = 'waist' | 'chest' | 'arm' | 'thigh';
export type WeightEntry = { date: string; value: number; revision: number };
export type Measurement = { date: string; revision: number } & Record<MeasureKey, number | null>;
export type ProgressPhoto = { id: string; date: string; revision: number; images: Partial<Record<Angle, ImageSourcePropType>>; weight?: number; waist?: number };
export type Session = { id: string; date: string; sport: string; name: string; status: 'planned' | 'completed' | 'in_progress' | 'abandoned' | 'missed' | 'rest'; minutes: number | null; rounds: number | null };
export type BoxingTest = { id: string; date: string; kind: 'Sac' | 'Corde' | 'Sparring'; value: number; revision: number };
export type ExerciseTrend = { id: string; title: string; unit: 'kg' | 'rep.'; points: { date: string; weight: number; reps: number; volume: number; estimatedMax: number | null; baseline?: boolean }[] };
export type SleepEntry = { date: string; minutes: number; quality: number };
export type ProgressData = { startDate: string | null; block: { startedAt: string; endsAt: string } | null; weights: WeightEntry[]; measures: Measurement[]; photos: ProgressPhoto[]; tests: BoxingTest[]; sessions: Session[]; exercises: ExerciseTrend[]; sleep: SleepEntry[] };
