import * as Crypto from 'expo-crypto';
import { Share } from 'react-native';
import { apiRequest } from '@/services/http';
import type { SquadGroupDetail, SquadInvitations, SquadOverview } from './types';
export type * from './types';

const id = () => Crypto.randomUUID();
const encode = (value: string) => encodeURIComponent(value);
export const loadSquad = () => apiRequest<SquadOverview>('/squad');
export const loadSquadGroup = (groupId: string) => apiRequest<SquadGroupDetail>(`/squad/groups/${encode(groupId)}`);
export const loadSquadInvitations = () => apiRequest<SquadInvitations>('/squad/invitations');
export const createSquadGroup = (name: string) => apiRequest<{ id: string }>('/squad/groups', { method: 'POST', body: { requestId: id(), name } });
export const renameSquadGroup = (groupId: string, name: string, revision: number) => apiRequest(`/squad/groups/${encode(groupId)}`, { method: 'PATCH', body: { requestId: id(), name, revision } });
export const leaveSquadGroup = (groupId: string) => apiRequest(`/squad/groups/${encode(groupId)}/leave`, { method: 'POST', body: { requestId: id() } });
export const transferSquadGroup = (groupId: string, userId: string) => apiRequest(`/squad/groups/${encode(groupId)}/transfer`, { method: 'POST', body: { requestId: id(), userId } });
export const removeSquadFriend = (userId: string) => apiRequest(`/squad/friends/${encode(userId)}/remove`, { method: 'POST', body: { requestId: id() } });
export const saveSquadPreferences = (revision: number, shareActivity: boolean, shareRecords: boolean) =>
  apiRequest('/squad/preferences', { method: 'PUT', body: { requestId: id(), revision, shareActivity, shareRecords } });
export const createSquadChallenge = (groupId: string, title: string, targetSessions: number, durationDays: 7 | 14) =>
  apiRequest(`/squad/groups/${encode(groupId)}/challenges`, { method: 'POST', body: { requestId: id(), title, targetSessions, durationDays } });
export const claimSquadInvitation = (token: string) => apiRequest(`/squad/invitations/claim/${encode(token)}`, { method: 'POST' });
export const resolveSquadInvitation = (invitationId: string, accept: boolean) =>
  apiRequest(`/squad/invitations/${encode(invitationId)}/resolve`, { method: 'POST', body: { accept } });
export const squadInviteLink = (token: string) => `coac-heroes:///squad/invite?token=${encode(token)}`;
export async function shareSquadInvitation(kind: 'friend' | 'group', groupId?: string, groupName?: string) {
  const token = id();
  await apiRequest('/squad/invitations', { method: 'POST', body: { token, kind, ...(groupId ? { groupId } : {}) } });
  const message = kind === 'friend' ? 'Ajoute-moi en ami sur Coac Heroes' : `Rejoins mon groupe ${groupName ?? 'Squad'} sur Coac Heroes`;
  await Share.share({ message: `${message} : ${squadInviteLink(token)}\nCode d’invitation : ${token}` });
  return token;
}
