import React, { useMemo } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import StoriesApp from '@/components/stories/StoriesApp';
import { fisioaccordoClient } from '@/data/fisioaccordoStoryConfig';
import { useActiveBrand } from '@/hooks/useActiveBrand';

const isLightHex = (hex: string): boolean => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // Perceived brightness (ITU-R BT.601)
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
};

const StoriesGenerator = () => {
  const { activeBrand, loading } = useActiveBrand();

  // Build the StoriesApp client from the currently active brand,
  // falling back to fisioaccordoClient if no brand is loaded yet.
  const client = useMemo(() => {
    if (!activeBrand) return fisioaccordoClient;
    const colors = [
      activeBrand.colore_primario || '#554697',
      activeBrand.colore_secondario || '#E6007E',
      activeBrand.colore_terziario || '#ffffff',
    ];
    return {
      ...fisioaccordoClient,
      id: activeBrand.id || 'active-brand',
      name: activeBrand.nome_business || 'Brand',
      city: activeBrand.citta || fisioaccordoClient.city,
      tone: activeBrand.tono_voce || fisioaccordoClient.tone,
      focus: (activeBrand.servizi || []).slice(0, 3).join(', ') || fisioaccordoClient.focus,
      brandFont: activeBrand.font_intestazioni || fisioaccordoClient.brandFont,
      brandColors: colors,
      bgIsLight: isLightHex(colors[0]),
      templateDataUrl: activeBrand.logo_url || null,
      clientInfo: {
        nome_business: activeBrand.nome_business,
        descrizione: activeBrand.descrizione,
        target_pazienti: activeBrand.target_pazienti,
        servizi: activeBrand.servizi,
        mission: activeBrand.mission,
      },
    };
  }, [activeBrand]);

  return (
    <div style={{ backgroundColor: 'var(--bg)', minHeight: '100%' }}>
      <ErrorBoundary>
        {/* key forces re-mount when brand changes so all internal state resets */}
        <StoriesApp key={activeBrand?.id || 'default'} client={client} />
      </ErrorBoundary>
    </div>
  );
};

export default StoriesGenerator;
