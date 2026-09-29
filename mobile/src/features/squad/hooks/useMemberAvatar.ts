import { useEffect, useState } from 'react';
import { useSession } from '@/providers/SessionProvider';
import { cacheSquadAvatarPhoto } from '@/storage/photos';
import type { SquadPerson } from '@/services/squad';

export function useMemberAvatar(avatar: SquadPerson['avatar']) {
  const { user } = useSession();
  const [photo, setPhoto] = useState<{ key: string; uri: string } | null>(null);
  const versionId = avatar?.versionId, kind = avatar?.kind;
  const key = user && versionId && kind ? `${user.id}-${versionId}-${kind}` : null;
  useEffect(() => {
    let active = true;
    if (user && versionId && kind && key) {
      void cacheSquadAvatarPhoto(user.id, versionId, kind).then(uri => {
        if (active) setPhoto({ key, uri });
      }).catch(() => { if (active) setPhoto(null); });
    }
    return () => { active = false; };
  }, [user?.id, versionId, kind, key]);
  return photo?.key === key ? photo?.uri ?? null : null;
}
