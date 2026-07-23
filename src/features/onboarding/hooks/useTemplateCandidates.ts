// Segue lo stato dei 9 candidati in tempo reale.
// Primo uso di Supabase Realtime nell'app: per sicurezza il polling (6s)
// resta SEMPRE attivo e fa da rete di sicurezza se il canale non parte.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { signedUrls } from '@/lib/storage';
import type { SlideRole } from '@/lib/brand/archetypes.ts';

export type CandidateStatus = 'pending' | 'generating' | 'done' | 'failed' | 'approved' | 'rejected';

export interface TemplateCandidate {
  id: string;
  brand_id: string;
  genome_version: number;
  slide_role: SlideRole;
  variant_index: 1 | 2 | 3;
  status: CandidateStatus;
  storage_bucket: string | null;
  storage_path: string | null;
  error: string | null;
  updated_at: string;
  /** Signed URL per il rendering, mintata client-side. */
  image_url?: string;
}

const POLL_MS = 6000;
const SIGNED_TTL = 3600;

export function useTemplateCandidates(brandId: string | null, genomeVersion: number | null) {
  const [candidates, setCandidates] = useState<TemplateCandidate[]>([]);
  const [genesisStatus, setGenesisStatus] = useState<string>('draft');
  const urlCache = useRef<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    if (!brandId) return;
    let query = (supabase as any)
      .from('template_candidates')
      .select('*')
      .eq('brand_id', brandId)
      .order('slide_role')
      .order('variant_index');
    if (genomeVersion != null) query = query.eq('genome_version', genomeVersion);
    const { data } = await query;
    const rows = ((data || []) as TemplateCandidate[]);

    // Minta le signed URL solo per i path nuovi (cache per non rifirmare a ogni poll).
    const missing = rows.filter((r) => r.storage_path && !urlCache.current.has(r.storage_path));
    if (missing.length > 0) {
      const urls = await signedUrls('brand-assets', missing.map((r) => r.storage_path as string), SIGNED_TTL);
      missing.forEach((r, i) => {
        if (urls[i]) urlCache.current.set(r.storage_path as string, urls[i]);
      });
    }
    setCandidates(rows.map((r) => ({
      ...r,
      image_url: r.storage_path ? urlCache.current.get(r.storage_path) : undefined,
    })));

    const { data: brand } = await (supabase as any)
      .from('brands')
      .select('genesis_status')
      .eq('id', brandId)
      .maybeSingle();
    if (brand?.genesis_status) setGenesisStatus(brand.genesis_status);
  }, [brandId, genomeVersion]);

  useEffect(() => {
    if (!brandId) return;
    load();

    // Realtime: aggiornamento immediato quando la edge fn tocca i candidati.
    const channel = supabase
      .channel(`tpl-candidates-${brandId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'template_candidates', filter: `brand_id=eq.${brandId}` },
        () => { load(); }
      )
      .subscribe();

    // Polling di sicurezza sempre attivo.
    const interval = setInterval(load, POLL_MS);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [brandId, load]);

  return { candidates, genesisStatus, reload: load };
}
