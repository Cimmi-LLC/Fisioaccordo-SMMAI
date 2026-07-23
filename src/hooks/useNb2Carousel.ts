// Produzione caroselli via NB2 + reference template (Fase 2 Template Genesis).
// Sostituisce il vecchio flusso SlideTemplate DOM + Pixabay.
//
// La produzione gira in background sulla edge fn (202): il progresso arriva
// da produced_carousels via Realtime, con polling di sicurezza sempre attivo.
// La riga persiste: i caroselli prodotti si possono riaprire in seguito.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractErrorMessage } from '@/lib/errors';
import { signedUrls, signedUrl } from '@/lib/storage';
import type { CarouselData, CarouselSlideData } from '@/types/carousel';
import type { SlideFormat } from '@/lib/brand/genome.ts';

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

type SlideRow = Omit<Nb2Slide, 'imageUrl'> & { status?: string };

type ProducedRow = {
  id: string;
  status: 'producing' | 'ready' | 'partial' | 'failed';
  slides: SlideRow[];
  storage_bucket: string;
  format: string;
  copy: CarouselData | Record<string, never>;
  title: string;
};

type GenomeWithMeta = {
  palette?: { bg_a: string; bg_b: string; text_on_light: string };
  format?: SlideFormat;
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

const POLL_MS = 6000;

export function useNb2Carousel(brandId: string | null, genome: unknown) {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Nb2Slide[]>([]);
  const [producing, setProducing] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [carouselId, setCarouselId] = useState<string | null>(null);
  const [format, setFormat] = useState<SlideFormat>('1:1');
  const bucketRef = useRef('carousel-images');
  const urlCache = useRef(new Map<string, string>());
  const watchedRow = useRef<string | null>(null);

  const meta = genome as GenomeWithMeta | null;
  const colors = {
    bg_color: meta?.palette?.bg_a || '#f7f5f0',
    title_color: meta?.palette?.text_on_light || '#1a1a1a',
    body_color: meta?.palette?.text_on_light || '#1a1a1a',
  };

  /** Applica una riga produced_carousels allo stato locale (con signed URL). */
  const applyRow = useCallback(async (row: ProducedRow) => {
    bucketRef.current = row.storage_bucket || 'carousel-images';
    setFormat(row.format === '4:5' ? '4:5' : '1:1');

    const rows = (row.slides || []) as SlideRow[];
    const missing = rows
      .map((s) => s.path)
      .filter((p): p is string => !!p && !urlCache.current.has(p));
    if (missing.length > 0) {
      try {
        const urls = await signedUrls(bucketRef.current, missing, 3600);
        missing.forEach((p, i) => { if (urls[i]) urlCache.current.set(p, urls[i]); });
      } catch { /* le slide senza URL restano in caricamento, il prossimo giro riprova */ }
    }

    setSlides(rows.map((s) => ({
      index: s.index,
      role: s.role,
      title: s.title,
      body: s.body || '',
      number: s.number || String(s.index + 1).padStart(2, '0'),
      illustration: s.illustration || '',
      path: s.path,
      imageUrl: s.path ? (urlCache.current.get(s.path) || null) : null,
      error: s.error ?? null,
    })));

    if (row.status !== 'producing') {
      setProducing(false);
      if (row.status === 'partial') {
        toast({
          title: 'Alcune slide sono fallite',
          description: 'Usa "Riprova" sulle slide vuote per rigenerarle.',
        });
      }
      if (row.status === 'failed') {
        toast({ title: 'Produzione fallita', description: 'Riprova con "Genera le slide".', variant: 'destructive' });
      }
    }
  }, [toast]);

  /** Realtime + polling sulla riga in produzione. */
  useEffect(() => {
    if (!carouselId) return;
    if (watchedRow.current === carouselId) return;
    watchedRow.current = carouselId;

    let cancelled = false;

    const fetchRow = async () => {
      const { data } = await (supabase as any)
        .from('produced_carousels')
        .select('id, status, slides, storage_bucket, format, copy, title')
        .eq('id', carouselId)
        .maybeSingle();
      if (data && !cancelled) await applyRow(data as ProducedRow);
      return (data as ProducedRow | null)?.status;
    };

    const channel = supabase
      .channel(`produced-${carouselId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'produced_carousels',
        filter: `id=eq.${carouselId}`,
      }, (payload) => {
        if (!cancelled) void applyRow(payload.new as ProducedRow);
      })
      .subscribe();

    // Polling di sicurezza sempre attivo finche la riga non e terminale.
    const interval = setInterval(async () => {
      const status = await fetchRow();
      if (status && status !== 'producing') {
        clearInterval(interval);
      }
    }, POLL_MS);

    void fetchRow();

    return () => {
      cancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
      if (watchedRow.current === carouselId) watchedRow.current = null;
    };
  }, [carouselId, applyRow]);

  /** Avvia la produzione in background di tutte le slide del carosello. */
  const produce = useCallback(async (carousel: CarouselData): Promise<string | null> => {
    if (!brandId) return null;
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
        body: {
          action: 'generate',
          brandId,
          slides: inputs,
          colors,
          copy: carousel,
          title: carousel.titolo_carosello,
        },
      });
      if (error || data?.error) {
        if (data?.error === 'template_not_locked') {
          throw new Error(data?.message || 'Template non ancora approvato');
        }
        throw new Error(data?.error || error?.message);
      }

      bucketRef.current = data.bucket || 'carousel-images';
      setFormat(data.format === '4:5' ? '4:5' : '1:1');
      setCarouselId(data.carouselId as string);
      return data.carouselId as string;
    } catch (e) {
      toast({ title: 'Errore produzione carosello', description: extractErrorMessage(e), variant: 'destructive' });
      setSlides([]);
      setProducing(false);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, toast, colors.bg_color, colors.title_color, colors.body_color]);

  /** Riapre un carosello prodotto in precedenza. */
  const reopen = useCallback(async (rowId: string): Promise<CarouselData | null> => {
    const { data } = await (supabase as any)
      .from('produced_carousels')
      .select('id, status, slides, storage_bucket, format, copy, title')
      .eq('id', rowId)
      .maybeSingle();
    if (!data) {
      toast({ title: 'Carosello non trovato', variant: 'destructive' });
      return null;
    }
    const row = data as ProducedRow;
    setProducing(row.status === 'producing');
    setCarouselId(row.id);
    await applyRow(row);
    const copy = row.copy as CarouselData;
    return copy && Array.isArray(copy.slides) ? copy : null;
  }, [applyRow, toast]);

  /** Rigenera una singola slide (dopo un edit del copy o un fallimento). */
  const regenerateSlide = useCallback(async (
    index: number,
    override?: { title?: string; body?: string }
  ): Promise<boolean> => {
    if (!brandId || !carouselId) return false;
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
      urlCache.current.set(data.path as string, url);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId, carouselId, slides, toast, colors.bg_color, colors.title_color, colors.body_color]);

  return {
    slides, producing, regenerating,
    carouselId, format,
    produce, regenerateSlide, reopen, setSlides,
  };
}
