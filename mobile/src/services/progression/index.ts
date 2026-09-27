import * as Crypto from 'expo-crypto';
import { apiRequest } from '@/services/http';
import { cachePhoto, uploadPhoto } from '@/storage/photos';
import { dailyTimezone } from '@/services/daily';
import { syncWorkouts } from '@/services/workouts';
import type { Angle, ProgressData } from './types';

type RemotePhoto = { id: string; date: string; revision: number; images: Partial<Record<Angle, string>> };
type RemoteProgress = Omit<ProgressData, 'photos'> & { photos: RemotePhoto[] };
const datePath = (date: string) => encodeURIComponent(date);
const write = (revision: number) => ({ requestId: Crypto.randomUUID(), revision, timezone: dailyTimezone() });

export async function loadProgression(userId: string): Promise<ProgressData> {
  await syncWorkouts(userId);
  const data = await apiRequest<RemoteProgress>('/progression');
  const photos = await Promise.all(data.photos.map(async photo => {
    const images = {} as ProgressData['photos'][number]['images'];
    await Promise.all(Object.entries(photo.images).map(async ([angle, id]) => {
      if (!id) return;
      try { images[angle as Angle] = { uri: await cachePhoto(userId, id) }; } catch { /* The other angles remain available. */ }
    }));
    const weight = data.weights.find(item => item.date === photo.date)?.value;
    const waist = data.measures.find(item => item.date === photo.date)?.waist ?? undefined;
    return { ...photo, images, weight, waist };
  }));
  return { ...data, photos };
}
export const saveProgressWeight = (date: string, value: number, revision: number) =>
  apiRequest(`/progression/weights/${datePath(date)}`, { method: 'PUT', body: { ...write(revision), value } });
export const saveProgressMeasurements = (date: string, values: { waist: number | null; chest: number | null; arm: number | null; thigh: number | null }, revision: number) =>
  apiRequest(`/progression/measurements/${datePath(date)}`, { method: 'PUT', body: { ...write(revision), ...values } });
export async function saveProgressPhotos(date: string, uris: Partial<Record<Angle, string>>, revision: number) {
  const images: Partial<Record<Angle, string>> = {};
  for (const [angle, uri] of Object.entries(uris)) if (uri) images[angle as Angle] = await uploadPhoto(uri);
  return apiRequest(`/progression/photos/${datePath(date)}`, { method: 'PUT', body: { ...write(revision), images } });
}
export const removeProgressPhoto = (date: string, angle: Angle, revision: number) =>
  apiRequest(`/progression/photos/${datePath(date)}/${angle}`, { method: 'DELETE', body: write(revision) });
export const saveBoxingTest = (date: string, kind: 'Sac' | 'Corde' | 'Sparring', value: number, revision: number) =>
  apiRequest(`/progression/boxing-tests/${datePath(date)}/${encodeURIComponent(kind)}`, { method: 'PUT', body: { ...write(revision), value } });
