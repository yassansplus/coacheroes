import * as FileSystem from 'expo-file-system/legacy';
import { apiUrl } from '@/config/api';
import { apiRequest, handleUnauthorized, notifyMutation } from '@/services/http';
import { getSessionToken } from '@/storage/session';
import type { AvatarPreferences } from './options';

export type ProfileAvatar = { versionId: string; status: 'pending' | 'processing' | 'ready' | 'failed' | 'superseded';
  errorCode: string | null; sourceUrl: string; generatedUrl: string | null; createdAt: string; completedAt: string | null } & AvatarPreferences;

export const getProfileAvatar = async () => (await apiRequest<ProfileAvatar | undefined>('/profile/avatar')) ?? null;
export const retryProfileAvatar = () => apiRequest<{ status: string }>('/profile/avatar/retry', { method: 'POST' });
export async function uploadProfileAvatar(uri: string, preferences: AvatarPreferences) {
  const token = getSessionToken();
  if (!token) throw new Error('Reconnecte-toi pour ajouter ta photo.');
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || (info.size ?? 0) > 8 * 1024 * 1024) throw new Error('Choisis une photo de moins de 8 Mo.');
  const result = await FileSystem.uploadAsync(apiUrl('/profile/avatar'), uri, {
    httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream',
      'X-Avatar-Platform': preferences.platform, 'X-Avatar-Genre': preferences.genre, 'X-Avatar-Art-Style': preferences.artStyle },
  });
  if (result.status === 401) handleUnauthorized(token);
  if (result.status !== 201) throw new Error('Impossible d’enregistrer ta photo. Réessaie.');
  notifyMutation();
  return JSON.parse(result.body) as Pick<ProfileAvatar, 'versionId' | 'status' | 'sourceUrl' | 'generatedUrl'>;
}
