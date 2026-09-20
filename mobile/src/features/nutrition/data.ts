import type { Food, Meal, MealMoment, Nutrients } from './types';
import { dailyGoals } from '@/config/dailyGoals';

export const goals: Nutrients = dailyGoals;
export const moments: MealMoment[] = ['Matin', 'Midi', 'Collation', 'Soir'];
export const momentIcons = { Matin: 'yogurt', Midi: 'chicken', Collation: 'apple', Soir: 'salad' } as const;
// Frontend fixtures only. Serving equivalences are illustrative, not a food database.
export const foods: Food[] = [
  { id: 'chicken', name: 'Poulet braisé', icon: 'chicken', baseUnit: 'g', per100: { calories: 166, protein: 22.7, carbs: 0, fat: 7 }, portion: 220, presets: [150, 220, 300], units: [{ label: 'g', amount: 1 }, { label: 'portion', amount: 220 }, { label: 'cuisse', amount: 150 }] },
  { id: 'rice', name: 'Riz blanc', icon: 'rice', baseUnit: 'g', per100: { calories: 130, protein: 2.4, carbs: 28.8, fat: 0.4 }, portion: 250, units: [{ label: 'g', amount: 1 }, { label: 'portion', amount: 150 }, { label: 'bol', amount: 250 }] },
  { id: 'sauce', name: 'Sauce', icon: 'salad', baseUnit: 'g', per100: { calories: 250, protein: 0, carbs: 20, fat: 18 }, portion: 20, presets: [10, 20, 40], units: [{ label: 'g', amount: 1 }, { label: 'cuillère', amount: 15 }] },
  { id: 'cola', name: 'Coca Zéro', icon: 'water', baseUnit: 'ml', per100: { calories: 0, protein: 0, carbs: 0, fat: 0 }, portion: 330, units: [{ label: 'ml', amount: 1 }, { label: 'verre', amount: 200 }, { label: 'canette', amount: 330 }] },
  { id: 'yogurt', name: 'Bol de yaourt aux fruits', icon: 'yogurt', baseUnit: 'g', per100: { calories: 128, protein: 7, carbs: 17, fat: 3.6 }, portion: 250, units: [{ label: 'g', amount: 1 }, { label: 'bol', amount: 250 }] },
  { id: 'snack', name: 'Collation pomme et amandes', icon: 'apple', baseUnit: 'g', per100: { calories: 165, protein: 8, carbs: 18, fat: 7 }, portion: 200, units: [{ label: 'g', amount: 1 }, { label: 'portion', amount: 200 }] },
  { id: 'dinner', name: 'Soupe et tartines', icon: 'salad', baseUnit: 'g', per100: { calories: 107.5, protein: 6, carbs: 11, fat: 4.5 }, portion: 400, units: [{ label: 'g', amount: 1 }, { label: 'portion', amount: 400 }] },
  { id: 'eggs', name: 'Œuf', icon: 'eggs', baseUnit: 'g', per100: { calories: 155, protein: 13, carbs: 1.1, fat: 11 }, portion: 60, units: [{ label: 'g', amount: 1 }, { label: 'pièce', amount: 60 }] },
];
export const foodById = Object.fromEntries(foods.map(food => [food.id, food])) as Record<string, Food>;
export function exampleItems() { return ['chicken', 'rice', 'sauce', 'cola'].map(foodId => ({ id: foodId, foodId, amount: foodById[foodId].portion })); }
export function initialMeals(date: string): Meal[] {
  return moments.map((moment, index) => ({ id: `example-${index}`, date, moment, time: ['08:10', '13:10', '16:45', '20:30'][index], source: 'example', items: index === 1 ? exampleItems() : [{ id: `item-${index}`, foodId: ['yogurt', 'chicken', 'snack', 'dinner'][index], amount: [250, 220, 200, 400][index] }] }));
}
