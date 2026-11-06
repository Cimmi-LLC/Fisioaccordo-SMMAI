import React from 'react';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CarouselData } from '@/types/carousel';
import { captionCarosello, righeSlide, testoCarosello } from '@/lib/carouselText';

/** I testi del carosello slide per slide, con la caption e «Copia». */
const CarouselCopyView: React.FC<{ carousel: CarouselData }> = ({ carousel }) => {
  const { toast } = useToast();
  const caption = captionCarosello(carousel);

  const copia = async (testo: string, cosa: string) => {
    try {
      await navigator.clipboard.writeText(testo);
      toast({ title: `${cosa} copiato` });
    } catch {
      toast({ title: 'Copia non riuscita', description: 'Seleziona il testo e copialo a mano.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3 text-left">
      {carousel.slides.map((s, i) => {
        const righe = righeSlide(s);
        if (!righe.length) return null;
        return (
          <div key={i} className="rounded-xl p-3" style={{ border: '1px solid var(--line)', backgroundColor: 'var(--surface)' }}>
            <p className="text-[10px] font-black uppercase mb-1" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              Slide {s.numero || i + 1}
            </p>
            <p className="text-[13px] font-bold" style={{ color: 'var(--ink)' }}>{righe[0]}</p>
            {righe.slice(1).map((r, j) => (
              <p key={j} className="text-[12px] mt-1" style={{ color: 'var(--ink2)' }}>{r}</p>
            ))}
          </div>
        );
      })}
      {caption && (
        <div className="rounded-xl p-3" style={{ border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-black uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Caption</p>
            <button
              onClick={() => copia(caption, 'Caption')}
              className="flex items-center gap-1 text-[11px] font-bold"
              style={{ color: 'var(--rosa)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Copy className="h-3 w-3" /> Copia
            </button>
          </div>
          <p className="text-[12px] whitespace-pre-line" style={{ color: 'var(--ink)' }}>{caption}</p>
        </div>
      )}
      <button
        onClick={() => copia(testoCarosello(carousel), 'Testo')}
        className="w-full flex items-center justify-center gap-2 text-[12px] font-black uppercase px-6 py-3 rounded-xl"
        style={{ backgroundColor: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', cursor: 'pointer', letterSpacing: '0.5px' }}
      >
        <Copy className="h-3.5 w-3.5" /> Copia tutto il testo
      </button>
    </div>
  );
};

export default CarouselCopyView;
