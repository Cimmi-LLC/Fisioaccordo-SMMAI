// Preview di produzione NB2 (Fase 2 Template Genesis).
// Le slide sono PNG generate dal modello con la reference del template
// approvato: qui si naviga, si edita il copy (con rigenerazione della
// singola slide), si scarica e si programma la pubblicazione.

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Download, CalendarClock, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { supabase } from '@/integrations/supabase/client';
import SchedulePostDialog from '@/components/schedule/SchedulePostDialog';
import { compositeLogo } from '@/lib/brand/composite.ts';
import { slotsForRole } from '@/lib/brand/skeleton.ts';
import type { TemplateGenome } from '@/lib/brand/genome.ts';
import type { Nb2Slide } from '@/hooks/useNb2Carousel';
import type { CarouselData } from '@/types/carousel';

interface Nb2CarouselPreviewProps {
  carousel: CarouselData;
  carouselId: string;
  slides: Nb2Slide[];
  producing: boolean;
  regenerating: number | null;
  onRegenerate: (index: number, override?: { title?: string; body?: string }) => Promise<boolean>;
}

const Nb2CarouselPreview: React.FC<Nb2CarouselPreviewProps> = ({
  carousel, carouselId, slides, producing, regenerating, onRegenerate,
}) => {
  const { toast } = useToast();
  const { activeBrand } = useActiveBrand();
  const [active, setActive] = useState(0);
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [editBody, setEditBody] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const genome = (activeBrand as { genome?: TemplateGenome } | null)?.genome ?? null;
  const current = slides[active];

  const caption = useMemo(() => {
    const tags = (carousel.hashtag_suggeriti || []).map((h) => '#' + String(h).replace(/^#/, '')).join(' ');
    return [carousel.caption_instagram, tags].filter(Boolean).join('\n\n');
  }, [carousel]);

  const copyCaption = async () => {
    await navigator.clipboard.writeText(caption);
    toast({ title: 'Caption copiata' });
  };

  const downloadSlide = (s: Nb2Slide) => {
    if (!s.imageUrl) return;
    const a = document.createElement('a');
    a.href = s.imageUrl;
    a.download = `slide-${s.index + 1}.png`;
    a.click();
  };

  /** Compone il logo reale su ogni slide e la carica: ritorna {bucket, paths}. */
  const prepareImagesForSchedule = async (): Promise<{ bucket: string; paths: string[] }> => {
    const logoUrl = activeBrand?.logo_url || '';
    const paths: string[] = [];
    let bucket = 'carousel-images';

    for (const s of slides) {
      if (!s.imageUrl) continue;
      let dataUrl: string;
      if (logoUrl && genome) {
        const slots = slotsForRole(genome, s.role);
        const blob = await compositeLogo(s.imageUrl, logoUrl, slots.logo);
        dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onloadend = () => resolve(String(r.result));
          r.readAsDataURL(blob);
        });
      } else {
        // Senza logo: ricarica la slide cosi com'e (save-slide-image accetta URL).
        const { data, error } = await supabase.functions.invoke('save-slide-image', {
          body: { imageUrl: s.imageUrl, slideIndex: s.index },
        });
        if (error || data?.error || !data?.path) throw new Error(data?.error || 'Upload fallito');
        paths.push(data.path);
        if (data.bucket) bucket = data.bucket;
        continue;
      }
      const { data, error } = await supabase.functions.invoke('save-slide-image', {
        body: { dataUrl, slideIndex: s.index },
      });
      if (error || data?.error || !data?.path) throw new Error(data?.error || 'Upload fallito');
      paths.push(data.path);
      if (data.bucket) bucket = data.bucket;
    }
    if (paths.length === 0) throw new Error('Nessuna slide pronta');
    return { bucket, paths };
  };

  if (slides.length === 0 && !producing) return null;

  return (
    <Card className="panel-card">
      <CardContent style={{ padding: 24 }}>
        {/* Slide viewer */}
        <div style={{ position: 'relative' }}>
          <div
            className="rounded-2xl overflow-hidden mx-auto"
            style={{ maxWidth: 440, aspectRatio: '1', backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}
          >
            {current?.imageUrl ? (
              <img src={current.imageUrl} alt={`slide ${active + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--viola)' }} />
                <span className="text-[12px]" style={{ color: 'var(--ink3)' }}>
                  {current?.error ? 'Generazione fallita' : 'Genero la slide…'}
                </span>
                {current?.error && (
                  <button
                    onClick={() => onRegenerate(current.index)}
                    className="text-[12px] font-bold px-4 py-2 rounded-xl text-white"
                    style={{ backgroundColor: 'var(--viola)', border: 'none', cursor: 'pointer' }}
                  >
                    Riprova
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Nav */}
          {slides.length > 1 && (
            <>
              <button
                onClick={() => setActive((a) => Math.max(0, a - 1))}
                disabled={active === 0}
                style={{
                  position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--line)',
                  backgroundColor: 'var(--surface)', cursor: 'pointer', opacity: active === 0 ? 0.4 : 1,
                }}
              ><ChevronLeft className="h-4 w-4 mx-auto" /></button>
              <button
                onClick={() => setActive((a) => Math.min(slides.length - 1, a + 1))}
                disabled={active === slides.length - 1}
                style={{
                  position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                  width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--line)',
                  backgroundColor: 'var(--surface)', cursor: 'pointer', opacity: active === slides.length - 1 ? 0.4 : 1,
                }}
              ><ChevronRight className="h-4 w-4 mx-auto" /></button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        <div className="flex gap-2 justify-center mt-4 overflow-x-auto pb-1">
          {slides.map((s) => (
            <button
              key={s.index}
              onClick={() => setActive(s.index)}
              style={{
                width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                border: s.index === active ? '2px solid var(--rosa)' : '1px solid var(--line)',
                backgroundColor: 'var(--bg)', cursor: 'pointer', padding: 0,
              }}
            >
              {s.imageUrl
                ? <img src={s.imageUrl} alt={`t${s.index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" style={{ color: 'var(--ink3)' }} />}
            </button>
          ))}
        </div>

        {/* Copy editor della slide attiva */}
        {current && (
          <div className="mt-5 rounded-xl p-4 space-y-2" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}>
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              Testo slide {active + 1} ({current.role})
            </div>
            <Textarea
              value={editTitle ?? current.title}
              onChange={(e) => setEditTitle(e.target.value)}
              rows={1}
              className="text-sm font-bold"
            />
            {current.role !== 'cover' && (
              <Textarea
                value={editBody ?? current.body}
                onChange={(e) => setEditBody(e.target.value)}
                rows={2}
                className="text-sm"
              />
            )}
            <button
              onClick={async () => {
                const ok = await onRegenerate(current.index, {
                  title: editTitle ?? undefined,
                  body: editBody ?? undefined,
                });
                if (ok) { setEditTitle(null); setEditBody(null); }
              }}
              disabled={regenerating === current.index}
              className="flex items-center gap-2 text-[12px] font-bold px-4 py-2 rounded-xl text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--viola)', border: 'none', cursor: 'pointer' }}
            >
              {regenerating === current.index
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Rigenero…</>
                : <><RefreshCw className="h-3.5 w-3.5" /> Rigenera slide</>}
            </button>
          </div>
        )}

        {/* Caption */}
        <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Caption</span>
            <button onClick={copyCaption} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--viola)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Copy className="h-3 w-3" /> Copia
            </button>
          </div>
          <p className="text-[12px] whitespace-pre-wrap" style={{ color: 'var(--ink2)' }}>{caption}</p>
        </div>

        {/* Azioni */}
        <div className="flex gap-2 mt-5">
          <button
            onClick={() => slides.forEach(downloadSlide)}
            disabled={producing}
            className="flex-1 flex items-center justify-center gap-2 text-[12px] font-bold py-3 rounded-xl"
            style={{ border: '1px solid var(--line)', backgroundColor: 'transparent', color: 'var(--ink2)', cursor: 'pointer' }}
          >
            <Download className="h-4 w-4" /> Scarica slide
          </button>
          <button
            onClick={() => setScheduleOpen(true)}
            disabled={producing || slides.some((s) => !s.imageUrl)}
            className="flex-1 flex items-center justify-center gap-2 text-[12px] font-black uppercase py-3 rounded-xl text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--rosa)', border: 'none', cursor: 'pointer', letterSpacing: '0.4px' }}
          >
            <CalendarClock className="h-4 w-4" /> Programma su Instagram
          </button>
        </div>

        <SchedulePostDialog
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          content={caption}
          prepareImages={prepareImagesForSchedule}
        />
      </CardContent>
    </Card>
  );
};

export default Nb2CarouselPreview;
