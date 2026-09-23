import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useSession } from '@/providers/SessionProvider';
import { ApiError } from '@/services/http';
import { loadConversation, prepareConversation, sendChatMessage, openProgramReview, sendProgramReview, type Conversation } from '@/services/chat';
export function usePreparationChat(purpose: 'onboarding' | 'program_review' = 'onboarding') {
  const { user } = useSession();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryPending, setRetryPending] = useState(false);
  const epoch = useRef(0), working = useRef(false);
  const pending = useRef<{ id: string; requestId: string; text: string; proposalId?: string | null } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const poll = useCallback(async (id: string, version: number) => {
    try {
      const next = await loadConversation(id);
      if (version !== epoch.current) return;
      setConversation(next); setError(null);
      if (['queued', 'processing'].includes(next.status)) timer.current = setTimeout(() => void poll(id, version), 2500);
    } catch (e) { if (version === epoch.current) setError(e instanceof Error ? e.message : 'Je n’arrive pas à te répondre. On réessaie ?'); }
  }, []);
  const open = useCallback(async () => {
    const version = ++epoch.current;
    clearTimeout(timer.current); working.current = true; setBusy(true); setError(null);
    try {
      const next = await (purpose === 'program_review' ? openProgramReview() : prepareConversation());
      if (version !== epoch.current) return;
      setConversation(next);
      if (['queued', 'processing'].includes(next.status)) timer.current = setTimeout(() => void poll(next.id, version), 1000);
    } catch (e) { if (version === epoch.current) setError(e instanceof Error ? e.message : 'Le coach est indisponible.'); }
    finally { if (version === epoch.current) { working.current = false; setBusy(false); } }
  }, [poll, purpose]);
  useFocusEffect(useCallback(() => {
    setConversation(null); setDraft(''); pending.current = null; setRetryPending(false);
    if (user) void open();
    return () => { epoch.current++; clearTimeout(timer.current); working.current = false; };
  }, [user?.id, open]));
  async function send(text = draft, requestId?: string) {
    if (working.current || !conversation || (!text.trim() && !pending.current)) return;
    working.current = true; setBusy(true); setError(null);
    const version = epoch.current;
    pending.current ??= { id: conversation.id, requestId: requestId ?? Crypto.randomUUID(), text: text.trim(), proposalId: conversation.proposalId };
    const operation = pending.current;
    try {
      const next = await (purpose === 'program_review' ? sendProgramReview(operation.id, operation.requestId, operation.text, operation.proposalId ?? '') : sendChatMessage(operation.id, operation.requestId, operation.text));
      if (version !== epoch.current) return;
      pending.current = null; setRetryPending(false); setDraft(''); setConversation(next);
      if (['queued', 'processing'].includes(next.status)) timer.current = setTimeout(() => void poll(next.id, version), 1000);
    } catch (e) {
      if (version !== epoch.current) return;
      setError(e instanceof Error ? e.message : 'Ton message n’a pas pu partir.');
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) { pending.current = null; setRetryPending(false); }
      else setRetryPending(true);
    } finally { if (version === epoch.current) { working.current = false; setBusy(false); } }
  }
  function retry() {
    if (pending.current) { void send(); return; }
    const last = conversation?.messages.filter(m => m.role === 'user').at(-1);
    if (conversation?.status === 'failed' && last?.requestId) void send(last.text, last.requestId);
    else void open();
  }
  return { conversation, draft, setDraft, busy, error, retryPending, send, retry };
}
