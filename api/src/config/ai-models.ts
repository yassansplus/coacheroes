import type { ConfigService } from '@nestjs/config';

export const aiContexts = {
  program: { variable: 'OPENAI_PROGRAM_MODEL', model: 'gpt-5.6-sol', reasoningEffort: 'high' },
  review: { variable: 'OPENAI_REVIEW_MODEL', model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
  onboarding: { variable: 'OPENAI_ONBOARDING_MODEL', model: 'gpt-5.6-luna', reasoningEffort: 'low' },
  nutritionPlan: { variable: 'OPENAI_NUTRITION_PLAN_MODEL', model: 'gpt-5.6-sol', reasoningEffort: 'high' },
  nutritionMeal: { variable: 'OPENAI_NUTRITION_MEAL_MODEL', model: 'gpt-6-luna', reasoningEffort: 'low' },
  nutritionCoach: { variable: 'OPENAI_NUTRITION_COACH_MODEL', model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
  coachChat: { variable: 'OPENAI_COACH_CHAT_MODEL', model: 'gpt-6-luna', reasoningEffort: 'low' },
} as const;
export type AiContext = keyof typeof aiContexts;
const allowedModels = new Set(['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-6-luna']);

export function resolveAiModel(context: AiContext, value: unknown): string {
  const { variable, model } = aiContexts[context];
  const selected = typeof value === 'string' ? value.trim() || model : model;
  if (!allowedModels.has(selected)) throw new Error(`${variable} selects an unsupported model.`);
  return selected;
}

export function aiSettings(config: ConfigService, context: AiContext) {
  const preset = aiContexts[context];
  // Deliberately ignore legacy OPENAI_MODEL: it must not override every context.
  return { model: resolveAiModel(context, config.get<string>(preset.variable)), reasoningEffort: preset.reasoningEffort };
}
