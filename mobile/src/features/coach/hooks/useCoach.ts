import { feedback } from '@/utils/feedback';
import { useState } from 'react';
import { lightCoachSets, setProgramAdjustment } from '@/store/programAdjustment';
import { getConversation, putConversation, useConversations } from '../store/conversations';
import type { CoachPage, Conversation, Proposal } from '../types';
import { evaluateDemoQuestion, weekRange } from '../utils';

let nextId = 0;
const id = () => `coach-${Date.now()}-${++nextId}`;
export function useCoach() {
  const conversations = useConversations();
  const [page, setPage] = useState<CoachPage>('questions');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [scope, setScope] = useState<'week' | 'ongoing'>('week');
  const conversation = conversations.find(item => item.id === conversationId);
  const proposal = conversation?.proposals.find(item => item.id === proposalId);

  function ask(text = draft, image = photo) {
    if (!text.trim() && !image) return;
    feedback('light');
    const now = Date.now();
    const current: Conversation = getConversation(conversationId) ?? { id: id(), title: text.trim().slice(0, 65) || 'Discussion autour d’une photo', updatedAt: now, messages: [], proposals: [] };
    const answer = image && !text.trim() ? { text: 'Ta photo est jointe à la conversation. L’analyse d’image sera disponible lors de la connexion du Coach. Que souhaites-tu regarder à son sujet ?', recommend: false, existingProposalId: undefined } : evaluateDemoQuestion(text, current);
    const nextProposal: Proposal | undefined = answer.recommend && !answer.existingProposalId ? { id: id(), status: 'pending', createdAt: now } : undefined;
    putConversation({ ...current, updatedAt: now, proposals: nextProposal ? [...current.proposals, nextProposal] : current.proposals,
      messages: [...current.messages, { id: id(), role: 'user', text: text.trim(), image, createdAt: now }, { id: id(), role: 'coach', text: answer.text, proposalId: nextProposal?.id ?? answer.existingProposalId, createdAt: now + 1 }] });
    setConversationId(current.id); setDraft(''); setPhoto(undefined); setPage('chat');
  }
  function openProposal(value: string) {
    const selected = conversation?.proposals.find(item => item.id === value);
    if (!selected) return;
    setProposalId(value); setScope(selected.scope ?? 'week'); setPage('reasons');
  }
  function decide(status: 'applied' | 'declined', selectedId = proposalId) {
    const current = getConversation(conversationId);
    const selected = current?.proposals.find(item => item.id === selectedId);
    if (!current || !selected || selected.status !== 'pending') { setPage('chat'); return; }
    const now = Date.now();
    feedback(status === 'applied' ? 'success' : 'selection');
    if (status === 'applied') setProgramAdjustment({ proposalId: selected.id, workoutId: 'muscu-b', scope, appliedAt: now, expiresAt: scope === 'week' ? weekRange(now).reset.getTime() : null, sets: { ...lightCoachSets }, minutes: 50, rir: 3 });
    putConversation({ ...current, updatedAt: now, proposals: current.proposals.map(item => item.id === selected.id ? { ...item, status, scope } : item), messages: [...current.messages, { id: id(), role: 'coach', createdAt: now, text: status === 'applied' ? `L’ajustement est appliqué à Muscu B ${scope === 'week' ? 'pour cette semaine uniquement' : 'jusqu’à nouvel ordre'}. Tu peux retrouver la séance dans Programme.` : 'Le programme actuel est conservé. Nous pouvons continuer à discuter de tes besoins.' }] });
    setPage('chat');
  }
  function resume(selected: Conversation) { setConversationId(selected.id); setProposalId(null); setDraft(''); setPhoto(undefined); setPage('chat'); }
  function newConversation() { setConversationId(null); setProposalId(null); setDraft(''); setPhoto(undefined); setPage('questions'); }
  return { page, setPage, conversations, conversation, proposal, draft, setDraft, photo, setPhoto, scope, setScope, ask, openProposal, decide, resume, newConversation };
}
