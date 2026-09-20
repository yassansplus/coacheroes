import type { Food, Ingredient, Meal, Nutrients } from './types';

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dateFromKey(key: string) { return new Date(`${key}T12:00:00`); }
export function shiftedDate(key: string, days: number) { const date = dateFromKey(key); date.setDate(date.getDate() + days); return localDate(date); }
export function totals(items: Ingredient[], lookup: Record<string, Food>): Nutrients {
  return items.reduce((sum, item) => {
    const food = lookup[item.foodId];
    if (!food || !Number.isFinite(item.amount) || item.amount < 0) return sum;
    for (const key of Object.keys(sum) as (keyof Nutrients)[]) sum[key] += food.per100[key] * item.amount / 100;
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
export function remaining(consumed: number, goal: number) { return Math.max(0, Math.round(goal - consumed)); }
export function quantityInUnit(amount: number, unit: Food['units'][number]) { return amount / unit.amount; }
export function quantityToBase(value: number, unit: Food['units'][number]) { return Number.isFinite(value) ? Math.max(1, Math.min(10000, value * unit.amount)) : 1; }
export function saveMeal(meals: Meal[], meal: Meal): Meal[] {
  const copy = { ...meal, items: meal.items.map(item => ({ ...item })) };
  return meals.some(item => item.id === meal.id) ? meals.map(item => item.id === meal.id ? copy : item) : [...meals, copy];
}
export function mealsInPeriod(meals: Meal[], date: string, period: string) {
  const end = dateFromKey(date); const start = dateFromKey(date);
  if (period === 'week') { start.setDate(start.getDate() - (start.getDay() + 6) % 7); end.setTime(start.getTime()); end.setDate(end.getDate() + 6); }
  if (period === 'month') { start.setDate(1); end.setMonth(end.getMonth() + 1, 0); }
  return meals.filter(meal => meal.date >= localDate(start) && meal.date <= localDate(end)).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}
