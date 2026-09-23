import { apiUrl } from '@/config/api';
import { getSessionToken } from '@/storage/session';
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
let onUnauthorized: (() => void) | undefined;
export function setUnauthorizedHandler(handler: (() => void) | undefined) { onUnauthorized = handler; }
export function handleUnauthorized(token: string | null) { if (getSessionToken() === token) onUnauthorized?.(); }
export async function apiRequest<T>(path: string, options: { method?: string; body?: unknown; anonymous?: boolean; timeoutMs?: number } = {}): Promise<T> {
  const token = getSessionToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(300000, Math.max(1000, options.timeoutMs ?? 20000)));
  try {
    const response = await fetch(apiUrl(path), {
      method: options.method ?? 'GET', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(!options.anonymous && token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 401 && !options.anonymous) handleUnauthorized(token);
      throw new ApiError(response.status, typeof data.message === 'string' ? data.message : 'Impossible d’enregistrer. Réessaie.');
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error('Le serveur est injoignable. Vérifie ta connexion puis réessaie.');
  } finally { clearTimeout(timeout); }
}
