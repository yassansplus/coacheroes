import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '@/providers/SessionProvider';
import { useTrainingProgramState } from '@/providers/TrainingProgramProvider';
import { feedback } from '@/utils/feedback';
import { decideCoachProposal, listCoachConversations, loadCoachConversation, sendCoachMessage } from '../coachApi';
import type { CoachPage, Conversation } from '../types';

export function useCoach() {
  const { user } = useSession();
  const { refresh: refreshProgram } = useTrainingProgramState();
  const [page, setPage] = useState<CoachPage>('questions');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const epoch = useRef(0);
  const owner = useRef(user?.id);
  owner.current = user?.id;
  const conversation = conversations.find(item => item.id === conversationId);
  const proposal = conversation?.proposals.find(item => item.id === proposalId);
  useEffect(() => {
    let live = true;
    epoch.current++;
    setConversations([]); setConversationId(null); setPage('questions'); setBusy(false); setError(null);
    if (user) void listCoachConversations().then(items => {
      if (live) setConversations(items.map(item => ({ ...item, messages: [], proposals: [] })));
    }).catch(e => { if (live) setError(e instanceof Error ? e.message : 'Impossible de charger les conversations.'); });
    return () => { live = false; };
  }, [user?.id]);
  function publish(next: Conversation) {
    setConversations(current => [next, ...current.filter(item => item.id !== next.id)].sort((a, b) => b.updatedAt - a.updatedAt));
    setConversationId(next.id);
  }
  async function ask(text = draft) {
    const value = text.trim();
    if (!value || busy || !user) return;
    if (photo) { setError('L’envoi de photo dans le chat arrive bientôt. Retire la photo pour envoyer ta question.'); return; }
    feedback('light'); setBusy(true); setError(null); setPage('chat');
    const version = epoch.current;
    const userId = user.id;
    try {
      const next = await sendCoachMessage(conversationId, randomUUID(), value);
      if (owner.current === userId && epoch.current === version) { publish(next); setDraft(''); }
    } catch (e) { if (owner.current === userId && epoch.current === version) setError(e instanceof Error ? e.message : 'Le coach n’a pas pu répondre.'); }
    finally { if (owner.current === userId) setBusy(false); }
  }
  function openProposal(id: string) { setProposalId(id); }
  function closeProposal() { setProposalId(null); }
  async function decide(status: 'applied' | 'declined', selectedId = proposalId) {
    if (!conversationId || !selectedId || busy) return;
    setBusy(true); setError(null);
    const version = epoch.current;
    const userId = user?.id;
    try {
      const next = await decideCoachProposal(conversationId, selectedId, status);
      if (owner.current !== userId || epoch.current !== version) return;
      publish(next); setProposalId(null);
      if (status === 'applied' && next.proposals.find(item => item.id === selectedId)?.kind === 'program_exercise') await refreshProgram();
      feedback(status === 'applied' ? 'success' : 'selection');
    } catch (e) { if (owner.current === userId && epoch.current === version) setError(e instanceof Error ? e.message : 'Impossible de valider le changement.'); }
    finally { if (owner.current === userId) setBusy(false); }
  }
  async function resume(selected: Conversation) {
    setBusy(true); setError(null);
    const version = ++epoch.current;
    const userId = user?.id;
    try { const next = await loadCoachConversation(selected.id); if (owner.current === userId && epoch.current === version) { publish(next); setProposalId(null); setPage('chat'); } }
    catch (e) { if (owner.current === userId && epoch.current === version) setError(e instanceof Error ? e.message : 'Impossible de charger la conversation.'); }
    finally { if (owner.current === userId) setBusy(false); }
  }
  function newConversation() { epoch.current++; setConversationId(null); setProposalId(null); setDraft(''); setPhoto(undefined); setPage('questions'); }
  return { page, setPage, conversations, conversation, proposal, draft, setDraft, photo, setPhoto, busy, error, ask, openProposal,
    closeProposal, decide, resume, newConversation };
}
