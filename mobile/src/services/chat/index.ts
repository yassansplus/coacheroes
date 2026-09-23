import { apiRequest } from '@/services/http';
type ChatMessage = { id: string; role: 'user' | 'assistant'; text: string; createdAt: string; requestId: string | null };
export type Conversation = { id: string; purpose: 'onboarding' | 'program_review'; proposalId?: string | null; status: 'awaiting_answer' | 'queued' | 'processing' | 'ready' | 'failed' | 'blocked'; sourceRevision: number; choices: string[]; error: string | null; messages: ChatMessage[] };
export const prepareConversation = () => apiRequest<Conversation>('/chat/onboarding', { method: 'POST' });
export const loadConversation = (id: string) => apiRequest<Conversation>(`/chat/${id}`);
export const sendChatMessage = (id: string, requestId: string, text: string) => apiRequest<Conversation>(`/chat/${id}/messages`, { method: 'POST', body: { requestId, text } });

export const openProgramReview = () => apiRequest<Conversation>('/program-review', { method: 'POST' });
export const sendProgramReview = (id: string, requestId: string, text: string, proposalId: string) => apiRequest<Conversation>(`/program-review/${id}/messages`, { method: 'POST', body: { requestId, text, proposalId } });
