import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { apiRequest } from '@/services/http';
import { useSession } from '@/providers/SessionProvider';
const goalLabels: Record<string, string> = { 'fat-loss': 'Perdre du gras', muscle: 'Prendre du muscle', recomposition: 'Recomposition', performance: 'Améliorer mes performances' };
export function useProfileSummary() {
  const { user } = useSession();
  const [profile, setProfile] = useState({ age: '', height: '', goals: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true); setError(null);
    void apiRequest<{ profile: { age?: string; height?: string; goal?: string[] } }>('/onboarding')
      .then(({ profile: saved }) => { if (active) setProfile({ age: saved.age ?? '', height: saved.height ?? '', goals: (saved.goal ?? []).map(goal => goalLabels[goal] ?? goal).join(' · ') }); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Impossible de charger le profil.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, attempt]));
  return { ...profile, error, loading, retry: () => setAttempt(value => value + 1) };
}
