import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { apiRequest } from './http';
export async function appleSignIn(): Promise<{ token: string } | null> {
  if (Platform.OS !== 'ios' || !await AppleAuthentication.isAvailableAsync())
    throw new Error('La connexion Apple est disponible sur la version iOS de l’application.');
  const { nonce } = await apiRequest<{ nonce: string }>('/auth/apple/challenge', { method: 'POST', anonymous: true });
  try {
    const credential = await AppleAuthentication.signInAsync({ nonce, requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
    if (!credential.identityToken) throw new Error('Apple n’a pas renvoyé de confirmation de connexion.');
    return await apiRequest<{ token: string }>('/auth/apple', { method: 'POST', anonymous: true, body: { identityToken: credential.identityToken, nonce, ...(credential.fullName?.givenName?.trim() ? { firstName: credential.fullName.givenName.trim().slice(0, 60) } : {}) } });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
}
