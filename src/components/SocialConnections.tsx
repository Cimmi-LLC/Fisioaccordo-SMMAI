import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Loader2, Video } from 'lucide-react';
import BrandSocialConnect from './BrandSocialConnect';
import SocialConnectResult from './SocialConnectResult';
import { SocialService, type SocialConnectResult as Result } from '@/services/socialService';
import { useSocialConnections } from '@/hooks/useSocialConnections';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { SOCIAL_PLATFORMS } from '@/lib/social/socialCore';

/** Impostazioni → TikTok e YouTube del brand attivo: un pulsante per ciascuno. */
const SocialConnections: React.FC = () => {
  const { brands, activeBrandId } = useActiveBrand();
  const { enabled, loading, reload, forBrand } = useSocialConnections();
  const [result, setResult] = useState<Result | null>(() => SocialService.peekConnectResult());
  useEffect(() => { SocialService.clearConnectResult(); }, []);
  const brandName = (id: string | null | undefined) => brands.find((b) => b.id === id)?.nome_business || null;
  const activeName = brandName(activeBrandId) || 'questo brand';

  return (
    <Card className="panel-card mt-4">
      <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
        <CardTitle className="flex items-center gap-2" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
          <Video className="h-4 w-4" style={{ color: 'var(--viola)' }} />
          TikTok e YouTube
          {brandName(activeBrandId) && <span className="font-semibold" style={{ color: 'var(--ink3)' }}>· {activeName}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: '22px 24px' }}>
        {result && (
          <SocialConnectResult result={result} brandName={brandName(result.brandId)} onClose={() => setResult(null)} />
        )}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--ink3)' }} />
          </div>
        ) : (
          <>
            {activeBrandId && SOCIAL_PLATFORMS.map((p) => (
              <BrandSocialConnect
                key={p}
                platform={p}
                brandId={activeBrandId}
                brandName={activeName}
                connection={forBrand(p, activeBrandId)}
                enabled={enabled[p]}
                justConnected={!!result?.success && result.platform === p && result.brandId === activeBrandId}
                onChanged={reload}
              />
            ))}
            <p className="text-xs leading-snug mt-3" style={{ color: 'var(--ink3)' }}>
              Un clic, dai il permesso sulla pagina di TikTok o di Google e torni qui. Da quel momento pubblichi
              video e caroselli da questa app e vedi visualizzazioni, like, commenti, condivisioni e follower.
              Continuando accetti la <Link to="/privacy" className="underline">Privacy Policy</Link> e i{' '}
              <Link to="/terms" className="underline">Termini</Link>.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SocialConnections;
