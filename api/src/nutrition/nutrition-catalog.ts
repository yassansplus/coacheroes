import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { NutritionFood } from './nutrition.entity';

type Per100 = NutritionFood['per100'];
const round = (value: number) => Math.round(value * 10) / 10;
const offSearchCache = new Map<string, number>();
const offSearchRequests: number[] = [];
const offProductRequests: number[] = [];
function reserveOffRequest(history: number[], limit: number) {
  const now = Date.now();
  while (history.length && history[0] <= now - 60000) history.shift();
  if (history.length >= limit) return false;
  history.push(now);
  return true;
}
function nutrients(raw: Record<string, unknown>, suffix = '_100g'): Per100 | null {
  const get = (key: string) => {
    const value = raw[`${key}${suffix}`];
    return typeof value === 'number' ? value : Number.NaN;
  };
  const calories = get('energy-kcal'), protein = get('proteins'), carbs = get('carbohydrates'), fat = get('fat');
  if (![calories, protein, carbs, fat].every(v => Number.isFinite(v) && v >= 0)) return null;
  return { calories: round(calories), protein: round(protein), carbs: round(carbs), fat: round(fat) };
}
export function iconFor(name: string) {
  const lower = name.toLocaleLowerCase('fr');
  if (/riz|pâtes|pasta|quinoa/.test(lower)) return 'rice';
  if (/poulet|dinde|chicken/.test(lower)) return 'chicken';
  if (/œuf|oeuf|egg/.test(lower)) return 'eggs';
  if (/pomme|apple|fruit/.test(lower)) return 'apple';
  if (/yaourt|yogurt|lait/.test(lower)) return 'yogurt';
  if (/eau|boisson|cola|soda|jus/.test(lower)) return 'water';
  return 'salad';
}
@Injectable()
export class NutritionCatalog {
  constructor(private readonly db: DataSource, private readonly config: ConfigService) {}
  private repo() { return this.db.getRepository(NutritionFood); }
  async byId(userId: string, id: string) {
    const food = await this.repo().findOneBy({ id });
    if (!food || (food.userId && food.userId !== userId)) throw new BadRequestException('Aliment introuvable.');
    return food;
  }
  view(food: NutritionFood) { return { id: food.id, name: food.name, icon: food.icon, baseUnit: food.baseUnit,
    per100: food.per100, units: food.units, portion: food.portion, provider: food.provider, providerId: food.providerId }; }
  private async save(provider: NutritionFood['provider'], providerId: string, name: string, per100: Per100, baseUnit: 'g' | 'ml' = 'g', userId: string | null = null, portion = 100) {
    const repo = this.repo();
    let row = await repo.findOneBy({ provider, providerId });
    if (!row) {
      row = repo.create({ provider, providerId, userId, name: name.slice(0, 180), per100, baseUnit, icon: iconFor(name),
        portion, units: [{ label: baseUnit, amount: 1 }, { label: 'portion', amount: portion }] });
      try { row = await repo.save(row); } catch { row = await repo.findOneByOrFail({ provider, providerId }); }
    }
    return row;
  }
  async barcode(code: string) {
    if (!/^\d{8,14}$/.test(code)) throw new BadRequestException('Code-barres invalide.');
    const cached = await this.repo().findOneBy({ provider: 'open_food_facts', providerId: code });
    if (cached) return this.view(cached);
    if (!reserveOffRequest(offProductRequests, 14)) return null;
    const http = await fetch(`https://world.openfoodfacts.org/api/v3/product/${code}.json?fields=code,product_name,brands,nutriments`, {
      headers: { 'User-Agent': 'CoacHeroes/1.0 (https://expo.dev/accounts/yassansplus/projects/coac-heroes)' }, signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!http.ok) return null;
    const json = await http.json() as { product?: { product_name?: string; brands?: string; nutriments?: Record<string, unknown> } };
    const product = json.product;
    const perMl = product?.nutriments && nutrients(product.nutriments, '_100ml');
    const macros = perMl || (product?.nutriments && nutrients(product.nutriments));
    if (!product?.product_name || !macros) return null;
    const name = [product.brands, product.product_name].filter(Boolean).join(' · ');
    return this.view(await this.save('open_food_facts', code, name, macros, perMl ? 'ml' : 'g'));
  }
  private async usda(query: string) {
    const key = this.config.get<string>('FOODDATA_CENTRAL_API_KEY')?.trim();
    if (!key) return [];
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`;
    const http = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, pageSize: 8, dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'] }), signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!http.ok) return [];
    const json = await http.json() as { foods?: { fdcId: number; description: string; foodNutrients?: { nutrientId: number; value: number }[] }[] };
    const found: NutritionFood[] = [];
    for (const food of json.foods ?? []) {
      const values = new Map(food.foodNutrients?.map(n => [n.nutrientId, n.value]) ?? []);
      const calories = values.get(1008), protein = values.get(1003), fat = values.get(1004), carbs = values.get(1005);
      if ([calories, protein, fat, carbs].some(v => v === undefined || !Number.isFinite(v) || v < 0)) continue;
      found.push(await this.save('usda', String(food.fdcId), food.description, { calories: round(calories!), protein: round(protein!), carbs: round(carbs!), fat: round(fat!) }));
    }
    return found;
  }
  private async openFoodFactsSearch(query: string) {
    const cacheKey = query.toLocaleLowerCase('fr');
    if ((offSearchCache.get(cacheKey) ?? 0) > Date.now()) return [];
    if (!reserveOffRequest(offSearchRequests, 9)) return [];
    const params = new URLSearchParams({ search_terms: query, search_simple: '1', action: 'process', json: '1', page_size: '8', fields: 'code,product_name,brands,nutriments' });
    const http = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, { headers: { 'User-Agent': 'CoacHeroes/1.0 (https://expo.dev/accounts/yassansplus/projects/coac-heroes)' }, signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!http.ok) return [];
    const json = await http.json() as { products?: { code?: string; product_name?: string; brands?: string; nutriments?: Record<string, unknown> }[] };
    offSearchCache.set(cacheKey, Date.now() + 10 * 60000);
    if (offSearchCache.size > 1000) offSearchCache.delete(offSearchCache.keys().next().value!);
    const found: NutritionFood[] = [];
    for (const product of json.products ?? []) {
      const perMl = product.nutriments && nutrients(product.nutriments, '_100ml');
      const macros = perMl || (product.nutriments && nutrients(product.nutriments));
      if (!product.code || !product.product_name || !macros) continue;
      found.push(await this.save('open_food_facts', product.code, [product.brands, product.product_name].filter(Boolean).join(' · '), macros, perMl ? 'ml' : 'g'));
    }
    return found;
  }
  async search(userId: string, query: string, remote = false) {
    const term = query.trim().slice(0, 100);
    if (/^\d{8,14}$/.test(term) && remote) { const food = await this.barcode(term); return food ? [food] : []; }
    const visible = await this.repo().createQueryBuilder('food')
      .where('(food.user_id IS NULL OR food.user_id = :userId)', { userId })
      .andWhere('food.name ILIKE :term', { term: `%${term.replace(/[%_]/g, '')}%` })
      .orderBy('food.created_at', 'DESC').take(20).getMany();
    if (!remote || term.length < 3) return visible.map(food => this.view(food));
    const [usda, off] = await Promise.all([this.usda(term).catch(() => []), this.openFoodFactsSearch(term).catch(() => [])]);
    const remoteFoods = [...usda, ...off];
    return [...new Map([...visible, ...remoteFoods].map(food => [food.id, food])).values()].map(food => this.view(food)).slice(0, 25);
  }
  async createManual(userId: string, name: string, per100: Per100, baseUnit: 'g' | 'ml', portion: number) {
    const row = await this.db.transaction(async manager => {
      const food = manager.create(NutritionFood, { userId, provider: 'manual', providerId: `${userId}:${randomUUID()}`,
        name, icon: iconFor(name), baseUnit, per100, portion, units: [{ label: baseUnit, amount: 1 }, { label: 'portion', amount: portion }] });
      await manager.save(food);
      await manager.query(
        'INSERT INTO journal_entries (id, user_id, request_id, type, occurred_at, recorded_at, payload) VALUES ($1, $2, $3, $4, $5, $5, $6::jsonb)',
        [randomUUID(), userId, randomUUID(), 'nutrition.food.created', new Date(), JSON.stringify({ schemaVersion: 1, foodId: food.id, name, per100, baseUnit, portion })],
      );
      return food;
    });
    return this.view(row);
  }
}
