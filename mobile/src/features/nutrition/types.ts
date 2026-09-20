export type Nutrients = { calories: number; protein: number; carbs: number; fat: number };
export type Food = {
  id: string; name: string; icon: string; baseUnit: 'g' | 'ml';
  per100: Nutrients; units: { label: string; amount: number }[];
  portion: number; presets?: number[];
};
export type Ingredient = { id: string; foodId: string; amount: number };
export type MealMoment = 'Matin' | 'Midi' | 'Collation' | 'Soir';
export type Meal = {
  id: string; date: string; moment: MealMoment; time: string; items: Ingredient[];
  source: 'example' | 'manual' | 'text' | 'photo'; description?: string; photo?: string;
};
