import { Injectable } from '@nestjs/common';
import { z } from 'zod';
const named = z.object({ id: z.number().int(), name: z.string() });
const rawExercise = z.object({
  id: z.number().int(), uuid: z.string(), category: named, equipment: z.array(named),
  muscles: z.array(named), muscles_secondary: z.array(named),
  license: z.object({ id: z.number(), full_name: z.string(), url: z.string() }), license_author: z.string(),
  translations: z.array(z.object({ id: z.number(), name: z.string(), description: z.string(), language: z.number(),
    license: z.number(), license_author: z.string(), license_author_url: z.string().optional(),
    license_object_url: z.string().optional(), license_derivative_source_url: z.string().optional() })),
});
export type CatalogExercise = {
  id: number; uuid: string; name: string; description: string; language: number;
  category: z.infer<typeof named>; equipment: z.infer<typeof named>[]; muscles: z.infer<typeof named>[];
  secondaryMuscles: z.infer<typeof named>[]; sourceUrl: string;
  license: { id: number; name: string; url: string }; author: string;
  translation: { id: number; licenseId: number; author: string; authorUrl: string; sourceUrl: string; derivativeSourceUrl: string };
};
export const searchSchema = z.strictObject({ categoryId: z.number().int().positive().nullable(),
  equipmentId: z.number().int().positive().nullable(), muscleId: z.number().int().positive().nullable(),
  offset: z.number().int().min(0).max(1000) });
export const detailsSchema = z.strictObject({ ids: z.array(z.number().int().positive()).min(1).max(8) });
export function normalizeExercise(value: unknown): CatalogExercise | null {
  const e = rawExercise.parse(value);
  const t = e.translations.find(t => t.language === 12) ?? e.translations.find(t => t.language === 2);
  if (!t) return null;
  return { id: e.id, uuid: e.uuid, name: t.name.slice(0, 200), language: t.language,
    description: t.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000),
    category: e.category, equipment: e.equipment, muscles: e.muscles, secondaryMuscles: e.muscles_secondary,
    sourceUrl: `https://wger.de/api/v2/exerciseinfo/${e.id}/`,
    license: { id: e.license.id, name: e.license.full_name, url: e.license.url }, author: e.license_author,
    translation: { id: t.id, licenseId: t.license, author: t.license_author, authorUrl: t.license_author_url ?? '',
      sourceUrl: t.license_object_url ?? '', derivativeSourceUrl: t.license_derivative_source_url ?? '' } };
}
export function compatible(e: CatalogExercise, allowed: number[]): boolean {
  // An empty equipment list is unknown, not evidence of a bodyweight exercise.
  return e.equipment.length > 0 && e.equipment.every(item => allowed.includes(item.id));
}
@Injectable()
export class WgerService {
  private readonly cache = new Map<string, { expires: number; value: unknown }>();
  private async get(path: string, signal?: AbortSignal): Promise<unknown> {
    const cached = this.cache.get(path);
    if (cached && cached.expires > Date.now()) return cached.value;
    const response = await fetch(`https://wger.de/api/v2/${path}`, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' }, redirect: 'error',
    });
    if (!response.ok) throw new Error(`WGER_HTTP_${response.status}`);
    const value: unknown = JSON.parse(await response.text(), (key, value: unknown) =>
      ['images', 'videos', 'image_url_main', 'image_url_secondary'].includes(key) ? undefined : value);
    if (this.cache.size >= 150) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(path, { value, expires: Date.now() + 15 * 60_000 });
    return value;
  }
  async filters(signal?: AbortSignal) {
    const load = async (path: string) => z.object({ results: z.array(named) }).parse(await this.get(`${path}/?limit=100`, signal)).results;
    const [categories, equipment, muscles] = await Promise.all([load('exercisecategory'), load('equipment'), load('muscle')]);
    return { categories, equipment, muscles, preferredLanguage: 'French, fallback English', pageSize: 20 };
  }
  async search(input: z.infer<typeof searchSchema>, allowed: number[], signal?: AbortSignal) {
    const p = searchSchema.parse(input);
    const query = new URLSearchParams({ limit: '20', offset: String(p.offset) });
    if (p.categoryId !== null) query.set('category', String(p.categoryId));
    if (p.equipmentId !== null) query.set('equipment', String(p.equipmentId));
    if (p.muscleId !== null) query.set('muscles', String(p.muscleId));
    const page = z.object({ count: z.number(), next: z.string().nullable(), results: z.array(z.unknown()) }).parse(await this.get(`exerciseinfo/?${query}`, signal));
    const results = page.results.map(normalizeExercise).filter((e): e is CatalogExercise => e !== null && compatible(e, allowed));
    return { results, nextOffset: page.next ? p.offset + 20 : null, totalBeforeCompatibilityFilter: page.count };
  }
  async details(ids: number[], allowed: number[], signal?: AbortSignal) {
    detailsSchema.parse({ ids });
    const found = await Promise.all([...new Set(ids)].map(async id => normalizeExercise(await this.get(`exerciseinfo/${id}/`, signal))));
    return found.filter((e): e is CatalogExercise => e !== null && compatible(e, allowed));
  }
}
