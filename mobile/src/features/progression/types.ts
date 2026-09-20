import type { ImageSourcePropType } from 'react-native';

export type ProgressPage = 'home' | 'weight' | 'measurements' | 'photos' | 'compare' | 'strength' | 'boxing' | 'attendance';
export type Angle = 'face' | 'profile' | 'back';
export type MeasureKey = 'waist' | 'chest' | 'arm' | 'thigh';
export type WeightEntry = { date: string; value: number };
export type Measurement = { date: string } & Record<MeasureKey, number>;
export type ProgressPhoto = { id: string; date: string; images: Partial<Record<Angle, ImageSourcePropType>>; example?: boolean; weight?: number; waist?: number };
export type Session = { date: string; sport: 'strength' | 'boxing' | 'rest'; missed?: boolean; minutes: number; rounds: number };
export type BoxingTest = { id: string; date: string; kind: 'Sac' | 'Corde' | 'Sparring'; value: number };
