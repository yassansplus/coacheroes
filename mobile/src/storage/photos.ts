import * as FileSystem from 'expo-file-system/legacy';
import { handleUnauthorized } from '@/services/http';
import { apiUrl } from '@/config/api';
import { getSessionToken } from './session';
const directory = () => `${FileSystem.cacheDirectory}onboarding-photos/`;
export async function cachePhoto(userId: string, id: string): Promise<string> {
  const token = getSessionToken();
  if (!token) throw new Error('Reconnecte-toi pour consulter tes photos.');
  await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
  const path = `${directory()}${userId}-${id}`;
  if ((await FileSystem.getInfoAsync(path)).exists) return path;
  const result = await FileSystem.downloadAsync(apiUrl(`/onboarding/photos/${id}`), path, { headers: { Authorization: `Bearer ${token}` } });
  if (result.status === 401) handleUnauthorized(token);
  if (result.status !== 200) { await FileSystem.deleteAsync(path, { idempotent: true }); throw new Error('Impossible de charger une photo. Réessaie.'); }
  return path;
}
export async function uploadPhoto(uri: string): Promise<string> {
  const token = getSessionToken();
  if (!token) throw new Error('Reconnecte-toi pour enregistrer tes photos.');
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || (info.size ?? 0) > 8 * 1024 * 1024) throw new Error('Choisis une photo de moins de 8 Mo.');
  const result = await FileSystem.uploadAsync(apiUrl('/onboarding/photos'), uri, {
    httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
  });
  if (result.status === 401) handleUnauthorized(token);
  if (result.status !== 201) throw new Error('Impossible d’enregistrer la photo. Vérifie son format et réessaie.');
  return (JSON.parse(result.body) as { id: string }).id;
}
export async function clearPhotoCache() { await FileSystem.deleteAsync(directory(), { idempotent: true }); }
