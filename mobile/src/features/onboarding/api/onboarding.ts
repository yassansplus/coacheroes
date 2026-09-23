import { apiRequest } from '@/services/http';
import type { OnboardingProfile } from '../types';
export type SavedOnboarding = { profile: Partial<OnboardingProfile>; currentStep: number; revision: number; completedAt: string | null };
export type SaveRequest = { profile: OnboardingProfile; currentStep: number; revision: number; requestId: string; occurredAt: string; timezone: string };
export const loadOnboarding = () => apiRequest<SavedOnboarding>('/onboarding');
export const saveOnboarding = (body: SaveRequest, complete: boolean) => apiRequest<SavedOnboarding>(complete ? '/onboarding/complete' : '/onboarding', { method: complete ? 'POST' : 'PUT', body });
