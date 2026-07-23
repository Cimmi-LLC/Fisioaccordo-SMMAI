// Produzione caroselli via NB2 + reference template (Fase 2 Template Genesis).
// Sostituisce il vecchio flusso SlideTemplate DOM + Pixabay.

import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractErrorMessage } from '@/lib/errors';
import { signedUrls, signedUrl } from '@/lib/storage';
import type { CarouselData, CarouselSlideData } from '@/types/carousel';

export interface Nb2Slide {
  index: number;
  role: 'cover' | 'content' | 'cta';
  title: string;
  body: string;
  number: string;
  /** Soggetto dell'illustrazione esplicativa (solo content). */
  illustration: string;
  /** Path storage della PNG generata (persistere questo, non l'URL). */
  path: string | null;
  /** Signed URL per il rendering. */
  imageUrl: string | null;
  error: string | null;
}

type GenomeWithPalette = {
  palette?: { bg_a: string; bg_b: string; text_on_light: string };
};

function slideRole(s: CarouselSlideData): 'cover' | 'content' | 'cta' {
  if (s.tipo === 'cover') return 'cover';
  if (s.tipo === 'cta') return 'cta';
  return 'content';
}

function slideTitle(s: CarouselSlideData): string {
  return s.hook || s.titolo || '';
}

function slideBody(s: CarouselSlideData): string {
  if (s.tipo === 'cover') return s.sottotitolo || '';
  if (s.tipo === 'cta') return s.testo_cta || s.testo || '';
  return s.testo || '';
}

/** Soggetto dell'illustrazione esplicativa: keywords della slide, o il titolo. */
function slideIllustration(s: CarouselSlideData): string {
  if (slideRole(s) !== 'content') return '';
  const kw = (s.keywords_stock || []).slice(0, 3).join(', ');
  return kw || slideTitle(s);
}

export function useNb2Carousel(brandId: string | null, genome: unknown) {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Nb2Slide[]>([]);
  const [producing, setProducing] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);

  const colors = (() => {
    const p = (genome as GenomeWithPalette | null)?.palette;
    return {
      bg_color: p?.bg_a || '#f7f5f0',
      title_color: p?.text_on_light || '#1a1a1a',
      body_color: p?.text_on_light || '#1a1a1a',
    };
  })();

  /** Genera tutte le slide del carosello via NB2. */
  const produce = useCallback(async (carousel: CarouselData, carouselId: string): Promise<boolean> => {
    if (!brandId) return false;
    setProducing(true);
    try {
      const inputs = carousel.slides.map((s, i) => ({
        index: i,
        role: slideRole(s),
        title: slideTitle(s),
        body: slideBody(s),
        number: String(s.numero ?? i + 1).padStart(2, '0'),
        illustration: slideIllustration(s),
      }));

      // Stato ottimistico: tutte le slide in "generazione".
      setSlides(inputs.map((inp) => ({ ...inp, path: null, imageUrl: null, error: null })));

      const { data, error } = await supabase.functions.invoke('generate-carousel-slides', {
        body: { action: 'generate', brandId, carouselId, slides: inputs, colors },
      });
      if (error || data?.error) {
        if (data?.error === 'template_not_locked') {
          throw new Error(data?.message || 'Template non ancora approvato');
        }
        throw new Error(data?.error || error?.message);
      }

      const produced = (data.slides || []) as Array<{ index: number; path: string | null; error: string | null }>;
      const paths = produced.filter((p) => p.path).map((p) => p.path as string);
      const urls = paths.length > 0 ? await signedUrls(data.bucket, paths, 3600) : [];
      const urlByPath = new Map(paths.map((p, i) => [p, urls[i]]));

      setSlides(inputs.map((inp) => {
        const r = produced.find((p) => p.index === inp.index);
        return {
          ...inp,
          path: r?.path ?? null,
          imageUrl: r?.path ? (urlByPath.get(r.path) || null) : null,
          error: r?.error ?? null,
        };
      }));

      if (data.failed > 0) {
        toast({
          title: `${data.ok}/${inputs.length} slide generate`,
          description: 'Alcune slide sono fallite: usa "Rigenera" sulle slide vuote.',
        });
      }
      return true;
    } catch (e) {
      toast({ title: 'Errore produzione carosello', description: extractErrorMessage(e), variant: 'destructive' });
      setSlides([]);
      return false;
    } finally {
      setProducing(false);
    }
  }, [brandId, colors, toast]);

  /** Rigenera una singola slide (dopo un edit del copy o un fallimento). */
  const regenerateSlide = useCallback(async (
    index: number,
    carouselId: string,
    override?: { title?: string; body?: string }
  ): Promise<boolean> => {
    if (!brandId) return false;
    const current = slides.find((s) => s.index === index);
    if (!current) return false;
    setRegenerating(index);
    try {
      const input = {
        index,
        role: current.role,
        title: override?.title ?? current.title,
        body: override?.body ?? current.body,
        number: current.number,
        illustration: current.illustration,
      };
      const { data, error } = await supabase.functions.invoke('generate-carousel-slides', {
        body: { action: 'regenerate', brandId, carouselId, slides: [input], colors },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);

      const url = await signedUrl(data.bucket, data.path, 3600);
      setSlides((prev) => prev.map((s) =>
        s.index === index
          ? { ...s, title: input.title, body: input.body, path: data.path, imageUrl: url, error: null }
          : s
      ));
      return true;
    } catch (e) {
      toast({ title: 'Errore rigenerazione slide', description: extractErrorMessage(e), variant: 'destructive' });
      return false;
    } finally {
      setRegenerating(null);
    }
  }, [brandId, colors, slides, toast]);

  return { slides, producing, regenerating, produce, regenerateSlide, setSlides };
}
