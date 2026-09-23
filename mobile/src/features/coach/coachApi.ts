import { apiRequest } from '@/services/http';
import type { Conversation } from './types';

export type ConversationListItem = Pick<Conversation, 'id' | 'title' | 'updatedAt'>;
type ApiConversation = Omit<Conversation, 'updatedAt' | 'messages' | 'proposals'> & {
  updatedAt: string; messages: (Omit<Conversation['messages'][number], 'createdAt'> & { createdAt: string })[];
  proposals: (Omit<Conversation['proposals'][number], 'createdAt'> & { createdAt: string })[];
};
function adapt(value: ApiConversation): Conversation {
  return { ...value, updatedAt: new Date(value.updatedAt).getTime(),
    messages: value.messages.map(item => ({ ...item, createdAt: new Date(item.createdAt).getTime() })),
    proposals: value.proposals.map(item => ({ ...item, createdAt: new Date(item.createdAt).getTime() })) };
}
function localDate() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
export const listCoachConversations = async () => (await apiRequest<{ id: string; title: string; updatedAt: string }[]>('/coach/conversations'))
  .map(item => ({ ...item, updatedAt: new Date(item.updatedAt).getTime() }));
export const loadCoachConversation = async (id: string) => adapt(await apiRequest<ApiConversation>(`/coach/conversations/${id}`));
export const sendCoachMessage = async (conversationId: string | null, requestId: string, text: string) => adapt(await apiRequest<ApiConversation>('/coach/messages', {
  method: 'POST', body: { conversationId, requestId, text, localDate: localDate() }, timeoutMs: 300000,
}));
export const decideCoachProposal = async (conversationId: string, proposalId: string, decision: 'applied' | 'declined') =>
  adapt(await apiRequest<ApiConversation>(`/coach/conversations/${conversationId}/proposals/${proposalId}/decision`, {
    method: 'POST', body: { decision }, timeoutMs: 120000,
  }));
