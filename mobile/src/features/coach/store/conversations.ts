import { useSyncExternalStore } from 'react';
import type { Conversation } from '../types';

let conversations: Conversation[] = [];
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => conversations;
export function useConversations() { return useSyncExternalStore(subscribe, snapshot, snapshot); }
export function putConversation(conversation: Conversation) {
  conversations = [conversation, ...conversations.filter(item => item.id !== conversation.id)].sort((a, b) => b.updatedAt - a.updatedAt);
  listeners.forEach(listener => listener());
}
export function getConversation(id: string | null) { return conversations.find(item => item.id === id); }
