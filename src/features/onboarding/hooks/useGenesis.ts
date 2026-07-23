// Orchestrazione client del flusso di genesi: upload sorgenti, analyze,
// generate/regenerate, approvazione.

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { extractErrorMessage } from '@/lib/errors';
import { extractPalette, type PaletteResult } from '@/lib/brand/extractor.ts';
import type { BrandSemantics } from '@/lib/brand/artDirector.ts';
import type { TemplateGenome, VisualStyle } from '@/lib/brand/genome.ts';
import { approveTemplate } from '@/lib/brand/approve.ts';

export function useGenesis(brandId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [palette, setPalette] = useState<PaletteResult | null>(null);
  const [semantics, setSemantics] = useState<BrandSemantics | null>(null);
  const [genome, setGenome] = useState<TemplateGenome | null>(null);
  const [genomeVersion, setGenomeVersion] = useState<number | null>(null);

  /**
   * Step 1: upload logo + post e righe brand_sources.
   * logo === null significa: recupera il logo gia salvato nel kit
   * (brands.logo_url) senza chiederlo di nuovo all'utente.
   */
  const uploadSources = useCallback(async (
    logo: File | null,
    posts: File[],
    existingLogoUrl?: string | null
  ): Promise<boolean> => {
    if (!user || !brandId) return false;
    setBusy(true);
    try {
      if (!logo) {
        if (!existingLogoUrl) throw new Error('Logo mancante');
        let blob: Blob | null = null;
        // Tentativo 1: fetch diretto (funziona per URL Supabase Storage).
        try {
          const res = await fetch(existingLogoUrl);
          if (res.ok) blob = await res.blob();
          if (blob && blob.type && !blob.type.startsWith('image/')) blob = null;
        } catch { /* CORS o rete: si passa al tentativo server-side */ }
        // Tentativo 2: la edge fn scarica il logo server-side (nessun CORS)
        // e lo deposita in brand-assets; da li lo leggiamo via storage API.
        if (!blob) {
          const { data, error } = await supabase.functions.invoke('generate-template', {
            body: { action: 'import_logo', brandId },
          });
          if (error || data?.error || !data?.path) {
            throw new Error('Non riesco a leggere il logo salvato nel brand: caricalo manualmente.');
          }
          const { data: dl, error: dlErr } = await supabase.storage
            .from(data.bucket as string)
            .download(data.path as string);
          if (dlErr || !dl) {
            throw new Error('Non riesco a leggere il logo salvato nel brand: caricalo manualmente.');
          }
          blob = dl;
        }
        const mime = blob.type || 'image/png';
        const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
        logo = new File([blob], `logo.${ext}`, { type: mime });
      }
      const uploads: Array<{ kind: string; file: File; path: string }> = [];
      const ext = (f: File) => (f.name.split('.').pop() || 'png').toLowerCase();
      uploads.push({ kind: 'logo', file: logo, path: `${user.id}/${brandId}/sources/logo.${ext(logo)}` });
      posts.slice(0, 6).forEach((f, i) => {
        uploads.push({ kind: 'post', file: f, path: `${user.id}/${brandId}/sources/post_${i + 1}.${ext(f)}` });
      });

      for (const u of uploads) {
        const { error: upErr } = await supabase.storage
          .from('brand-assets')
          .upload(u.path, u.file, { contentType: u.file.type || 'image/png', upsert: true });
        if (upErr) throw new Error(`Upload ${u.kind} fallito: ${upErr.message}`);
        // upsert della riga sorgente (il logo e UNIQUE per brand)
        if (u.kind === 'logo') {
          await (supabase as any).from('brand_sources').delete()
            .eq('brand_id', brandId).eq('kind', 'logo');
        }
        const { error: insErr } = await (supabase as any).from('brand_sources').insert({
          brand_id: brandId,
          user_id: user.id,
          kind: u.kind,
          storage_bucket: 'brand-assets',
          storage_path: u.path,
        });
        if (insErr && insErr.code !== '23505') {
          throw new Error(`Registrazione ${u.kind} fallita: ${insErr.message}`);
        }
      }

      // Palette programmatica client-side (deterministica).
      const pal = await extractPalette([logo, ...posts.slice(0, 6)]);
      setPalette(pal);

      await (supabase as any).from('brands')
        .update({ genesis_status: 'sources_uploaded' })
        .eq('id', brandId);
      return true;
    } catch (e) {
      toast({ title: 'Errore caricamento', description: extractErrorMessage(e), variant: 'destructive' });
      return false;
    } finally {
      setBusy(false);
    }
  }, [user, brandId, toast]);

  /** Step 2: lettura semantica via edge fn. */
  const analyze = useCallback(async (): Promise<boolean> => {
    if (!brandId) return false;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-template', {
        body: { action: 'analyze', brandId },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setSemantics(data.semantics as BrandSemantics);
      return true;
    } catch (e) {
      toast({ title: 'Errore analisi', description: extractErrorMessage(e), variant: 'destructive' });
      return false;
    } finally {
      setBusy(false);
    }
  }, [brandId, toast]);

  /** Step 3: genesi (o rigenerazione con feedback), con lo stile visual scelto. */
  const generate = useCallback(async (feedback?: string, visualStyle?: VisualStyle): Promise<boolean> => {
    if (!brandId || !palette) return false;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-template', {
        body: {
          action: feedback ? 'regenerate' : 'generate',
          brandId,
          palette,
          semantics,
          feedback,
          visualStyle: visualStyle ?? 'flat_icon',
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setGenome(data.genome as TemplateGenome);
      setGenomeVersion(data.genomeVersion as number);
      return true;
    } catch (e) {
      toast({ title: 'Errore generazione', description: extractErrorMessage(e), variant: 'destructive' });
      return false;
    } finally {
      setBusy(false);
    }
  }, [brandId, palette, semantics, toast]);

  /** Step 4: approvazione dei 3 selezionati. */
  const approveAll = useCallback(async (candidateIds: string[]): Promise<boolean> => {
    setBusy(true);
    try {
      for (const id of candidateIds) {
        await approveTemplate(supabase as any, id);
      }
      toast({ title: 'Template approvato', description: 'Il tuo template e pronto per generare caroselli.' });
      return true;
    } catch (e) {
      toast({ title: 'Errore approvazione', description: extractErrorMessage(e), variant: 'destructive' });
      return false;
    } finally {
      setBusy(false);
    }
  }, [toast]);

  return {
    busy,
    palette, setPalette,
    semantics, setSemantics,
    genome, genomeVersion,
    uploadSources, analyze, generate, approveAll,
  };
}
