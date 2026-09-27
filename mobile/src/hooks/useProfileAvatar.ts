import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useSession } from '@/providers/SessionProvider';
import { getProfileAvatar, retryProfileAvatar, uploadProfileAvatar, type ProfileAvatar } from '@/services/profileAvatar';
import { cacheAvatarPhoto } from '@/storage/photos';
import type { AvatarPreferences } from '@/services/profileAvatar/options';

export function useProfileAvatar() {
  const { user } = useSession();
  const [avatar, setAvatar] = useState<ProfileAvatar | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = useRef<ProfileAvatar['status'] | null>(null);
  const currentVersion = useRef<string | null>(null);
  const localPreview = useRef<string | null>(null);
  const inFlight = useRef(false);
  const uploadingRef = useRef(false);
  const changeEpoch = useRef(0);

  const refresh = useCallback(async (active: () => boolean = () => true) => {
    if (!user?.id || inFlight.current || uploadingRef.current) return;
    inFlight.current = true;
    const epoch = changeEpoch.current;
    try {
      const next = await getProfileAvatar();
      if (!active() || epoch !== changeEpoch.current) return;
      status.current = next?.status ?? null;
      setAvatar(next);
      if (!next) { currentVersion.current = null; setUri(null); return; }
      if (currentVersion.current !== next.versionId) { currentVersion.current = next.versionId; localPreview.current = null; }
      if (next.status !== 'ready' && localPreview.current) { setUri(localPreview.current); return; }
      const path = await cacheAvatarPhoto(user.id, next.versionId, next.status === 'ready' ? 'generated' : 'source');
      if (active() && epoch === changeEpoch.current) { setUri(path); if (next.status === 'ready') localPreview.current = null; }
    } catch (cause) { if (active() && epoch === changeEpoch.current) setError(cause instanceof Error ? cause.message : 'Impossible de charger ton avatar.'); }
    finally { inFlight.current = false; }
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    let active = true;
    void refresh(() => active);
    const timer = setInterval(() => { if (status.current === 'pending' || status.current === 'processing') void refresh(() => active); }, 4000);
    return () => { active = false; clearInterval(timer); };
  }, [refresh]));

  const upload = useCallback(async (selectedUri: string, preferences: AvatarPreferences) => {
    changeEpoch.current++;
    uploadingRef.current = true;
    localPreview.current = selectedUri; setUri(selectedUri); setError(null); setUploading(true);
    try {
      const saved = await uploadProfileAvatar(selectedUri, preferences);
      currentVersion.current = saved.versionId; status.current = saved.status;
      setAvatar({ ...saved, ...preferences, errorCode: null, createdAt: new Date().toISOString(), completedAt: null });
    } catch (cause) { localPreview.current = null; setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer ta photo.'); }
    finally { uploadingRef.current = false; setUploading(false); void refresh(); }
  }, [refresh]);
  const retry = useCallback(async () => {
    setError(null);
    try { await retryProfileAvatar(); status.current = 'pending'; void refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible de relancer la création.'); }
  }, [refresh]);
  return { avatar, uri, uploading, error, upload, retry };
}
