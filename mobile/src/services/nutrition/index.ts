import * as FileSystem from 'expo-file-system/legacy';
import { apiUrl } from '@/config/api';
import { apiRequest, handleUnauthorized } from '@/services/http';
import { getSessionToken } from '@/storage/session';

export type Nutrients = { calories: number; protein: number; carbs: number; fat: number };
export type Food = { id: string; name: string; icon: string; baseUnit: 'g' | 'ml'; per100: Nutrients;
  units: { label: string; amount: number }[]; portion: number; presets?: number[]; provider?: 'open_food_facts' | 'usda' | 'manual' | 'ai_estimate';
  macroSource?: 'estimated' | 'web'; sourceUrl?: string | null };
export type Ingredient = { id: string; foodId: string; amount: number;
  estimatedFood?: Pick<Food, 'id' | 'name' | 'baseUnit' | 'per100'> & { macroSource: 'estimated' | 'web'; sourceUrl: string | null } };
export type MealMoment = 'Matin' | 'Midi' | 'Collation' | 'Soir';
export type Meal = { id: string; date: string; moment: MealMoment; time: string; items: Ingredient[];
  source: 'manual' | 'text' | 'photo' | 'example'; description?: string; photo?: string; photoId?: string;
  revision?: number; coachNote?: string; coachOpinion?: { text: string; at: string; basedOnRevision: number }; totals?: Nutrients };
export type NutritionPlan = { programRunId: string; status: 'queued' | 'processing' | 'ready' | 'failed';
  targets: (Nutrients & { coachNote: string; assumptions: string[] }) | null };
export type NutritionDashboard = { plan: NutritionPlan | null; meals: Meal[]; foods: Food[] };
export function nutritionDailyTotals(data: NutritionDashboard, date: string): Nutrients {
  const catalog = new Map(data.foods.map(food => [food.id, food]));
  const total: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const meal of data.meals) {
    if (meal.date !== date) continue;
    for (const item of meal.items) {
      const food = catalog.get(item.foodId);
      if (!food) continue;
      for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) total[key] += food.per100[key] * item.amount / 100;
    }
  }
  return total;
}
export type Analysis = { items: Ingredient[]; foods: Food[]; unresolved: string[]; clarificationQuestion: string | null;
  source: 'text' | 'photo'; photoId: string | null };
export const loadNutrition = () => apiRequest<NutritionDashboard>('/nutrition');
export const retryNutritionPlan = () => apiRequest('/nutrition/plan/retry', { method: 'POST' });
export const searchNutritionFoods = (query: string, remote = false) => apiRequest<Food[]>(`/nutrition/foods?q=${encodeURIComponent(query)}${remote ? '&remote=1' : ''}`);
export const analyzeNutritionMeal = (source: 'text' | 'photo', description: string, photoId?: string) =>
  apiRequest<Analysis>('/nutrition/analyze', { method: 'POST', body: { source, description, ...(photoId ? { photoId } : {}) }, timeoutMs: 120000 });
export const saveNutritionMeal = (meal: Meal, requestId: string) => apiRequest<Meal>('/nutrition/meals', { method: 'PUT', body: {
  id: meal.id, requestId, revision: meal.revision ?? 0, date: meal.date, moment: meal.moment, time: meal.time,
  source: meal.source === 'example' ? 'manual' : meal.source, description: meal.description ?? '',
  ...(meal.photoId ? { photoId: meal.photoId } : {}),
  items: meal.items,
} });
export const deleteNutritionMeal = (id: string) => apiRequest<{ deleted: boolean }>(`/nutrition/meals/${id}`, { method: 'DELETE' });
export const requestNutritionMealOpinion = (id: string) => apiRequest<Meal>(`/nutrition/meals/${id}/opinion`, { method: 'POST', timeoutMs: 120000 });
export async function uploadNutritionPhoto(uri: string): Promise<string> {
  const token = getSessionToken();
  if (!token) throw new Error('Reconnecte-toi pour analyser ce repas.');
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || (info.size ?? 0) > 8 * 1024 * 1024) throw new Error('Choisis une photo de moins de 8 Mo.');
  const result = await FileSystem.uploadAsync(apiUrl('/nutrition/photos'), uri, {
    httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
  });
  if (result.status === 401) handleUnauthorized(token);
  if (result.status !== 201) throw new Error('Impossible d’envoyer la photo. Vérifie son format.');
  return (JSON.parse(result.body) as { id: string }).id;
}
