import { useCallback, useEffect, useState } from 'react';
import { SocialService, type SocialConnectionData } from '@/services/socialService';
import type { SocialPlatform } from '@/lib/social/socialCore';

/** Account TikTok/YouTube dell'utente e quali piattaforme sono attive sul server. */
export const useSocialConnections = () => {
  const [connections, setConnections] = useState<SocialConnectionData[]>([]);
  const [enabled, setEnabled] = useState<Record<SocialPlatform, boolean>>({ tiktok: false, youtube: false });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [list, status] = await Promise.all([SocialService.getConnections(), SocialService.status()]);
    setConnections(list);
    setEnabled(status);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const forBrand = useCallback(
    (platform: SocialPlatform, brandId: string | null) =>
      connections.find((c) => c.platform === platform && c.brand_id === brandId)
      ?? (brandId ? null : connections.find((c) => c.platform === platform) ?? null),
    [connections],
  );

  return { connections, enabled, loading, reload, forBrand };
};
