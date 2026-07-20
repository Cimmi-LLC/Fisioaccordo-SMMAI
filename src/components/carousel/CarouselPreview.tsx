import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight, Copy, Download, RefreshCw, Pencil, Check, X, Loader2, Hash, ImageIcon, Shuffle, Upload, CalendarClock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCarouselPreview } from '@/hooks/useCarouselPreview';
import SlideTemplateBase from './SlideTemplate';
import SlideTemplateNeon from './SlideTemplateNeon';

/** Sceglie il template in base allo stile grafico impostato sul brand. */
const SlideTemplate: React.FC<any> = (props) => {
  const { activeBrand } = useActiveBrand();
  const neon = (activeBrand as any)?.slide_style === 'neon';
  return neon ? <SlideTemplateNeon {...props} /> : <SlideTemplateBase {...props} />;
};
import MinimalProgressBar from './MinimalProgressBar';
import SchedulePostDialog from '@/components/schedule/SchedulePostDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import type { CarouselData } from '@/types/carousel';

interface CarouselPreviewProps {
  data: CarouselData | null;
  format?: '1:1' | '9:16';
}

const PREVIEW_SCALE = 0.34;

const CarouselPreview: React.FC<CarouselPreviewProps> = ({ data, format = '1:1' }) => {
  const {
    carousel,
    activeSlide,
    setActiveSlide,
    editingSlide,
    setEditingSlide,
    regeneratingSlide,
    generatingImages,
    imageProgress,
    regeneratingImage,
    renderConfig,
    updateSlideText,
    regenerateSlide,
    regenerateSingleImage,
    swapSlideImage,
    swappingImage,
    nextSlide,
    prevSlide,
    copyCaption,
  } = useCarouselPreview(data);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { user } = useAuth();
  const { activeBrand } = useActiveBrand();

  // Common template props
  const templateProps = {
    colorPrimary: renderConfig.brandColor,
    colorSecondary: renderConfig.brandColorSecondary,
    colorTerziario: activeBrand?.colore_terziario || '#1a1a2e',
    fontFamily: renderConfig.brandFont,
    logoUrl: renderConfig.logoUrl,
    logoInitials: carousel?.titolo_carosello?.substring(0, 2).toUpperCase() || 'FA',
    totalSlides: carousel?.slides.length || 0,
    postTemplateId: activeBrand?.post_template_id || null,
  };

  const exportAllSlides = async () => {
    try {
      const { toPng } = await import('html-to-image');
      for (let i = 0; i < (carousel?.slides.length || 0); i++) {
        const node = document.getElementById(`slide-export-${i}`);
        if (!node) continue;
        const dataUrl = await toPng(node, { quality: 1, pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `slide-${i + 1}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const prepareImagesForSchedule = async (): Promise<string[]> => {
    if (!carousel) return [];
    const { toPng } = await import('html-to-image');
    const urls: string[] = [];
    for (let i = 0; i < carousel.slides.length; i++) {
      const node = document.getElementById(`slide-export-${i}`);
      if (!node) continue;
      const dataUrl = await toPng(node, { quality: 1, pixelRatio: 2 });
      const { data, error } = await supabase.functions.invoke('save-slide-image', {
        body: { dataUrl, userId: user?.id, slideIndex: i },
      });
      if (error || data?.error || !data?.url) {
        throw new Error(data?.error || error?.message || `Errore upload slide ${i + 1}`);
      }
      urls.push(data.url as string);
    }
    return urls;
  };

  if (!carousel || carousel.slides.length === 0) {
    return (
      <Card className="panel-card">
        <CardContent style={{ padding: '24px' }}>
          <div className="py-12 text-center">
            <div className="space-y-3 animate-pulse mb-4">
              <div className="h-5 rounded-lg w-2/3 mx-auto" style={{ backgroundColor: 'var(--line)' }} />
              <div className="h-4 rounded-lg w-full" style={{ backgroundColor: 'var(--line)' }} />
              <div className="aspect-square max-w-xs mx-auto rounded-lg mt-4" style={{ backgroundColor: 'var(--line)' }} />
            </div>
            <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
              Scrivi un argomento e clicca "Genera Contenuto"
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const slide = carousel.slides[activeSlide];
  const isEditing = editingSlide === activeSlide;
  const slideType = slide.tipo || (activeSlide === 0 ? 'cover' : activeSlide === carousel.slides.length - 1 ? 'cta' : 'content');
  const isContentSlide = slideType === 'content';
  // Slides that have an image (cover + content). CTA usually has no image.
  const hasImageRole = slideType === 'content' || slideType === 'cover';
  const isImageLoading = generatingImages && hasImageRole && !slide.imageUrl;
  const isRegeneratingThisImage = regeneratingImage === activeSlide;

  return (
    <div className="space-y-4">
      {/* Image generation progress */}
      {generatingImages && (
        <MinimalProgressBar current={imageProgress.current} total={imageProgress.total} />
      )}

      {/* Main preview */}
      <Card className="panel-card overflow-hidden">
        <CardContent style={{ padding: 0 }}>
          <div className="flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Prev */}
            <button
              onClick={prevSlide}
              disabled={activeSlide === 0}
              className="flex-shrink-0 p-2 rounded-full disabled:opacity-20 transition-opacity"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', cursor: activeSlide === 0 ? 'default' : 'pointer' }}
            >
              <ChevronLeft className="h-5 w-5" style={{ color: 'var(--ink3)' }} />
            </button>

            {/* Slide */}
            <div className="mx-4 relative">
              {/* Loading overlay */}
              {(isImageLoading || isRegeneratingThisImage) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <Loader2 className="h-8 w-8 animate-spin mb-2" style={{ color: '#fff' }} />
                  <span className="text-[11px] font-semibold" style={{ color: '#fff' }}>
                    {isRegeneratingThisImage ? 'Rigenerando...' : 'Generando immagine...'}
                  </span>
                </div>
              )}

              <SlideTemplate slide={slide} {...templateProps} scale={PREVIEW_SCALE} onRetryImage={hasImageRole ? () => regenerateSingleImage(activeSlide) : undefined} />

              {/* Role badge */}
              <div
                className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', letterSpacing: '0.5px' }}
              >
                {slide.tipo || 'content'}
              </div>
            </div>

            {/* Next */}
            <button
              onClick={nextSlide}
              disabled={activeSlide === carousel.slides.length - 1}
              className="flex-shrink-0 p-2 rounded-full disabled:opacity-20 transition-opacity"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', cursor: activeSlide === carousel.slides.length - 1 ? 'default' : 'pointer' }}
            >
              <ChevronRight className="h-5 w-5" style={{ color: 'var(--ink3)' }} />
            </button>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 p-3 overflow-x-auto" style={{ borderTop: '1px solid var(--line)' }}>
            {carousel.slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className="flex-shrink-0 relative rounded-lg overflow-hidden transition-all"
                style={{
                  width: 48, height: 60,
                  border: i === activeSlide ? '2px solid var(--rosa)' : '2px solid var(--line)',
                  opacity: i === activeSlide ? 1 : 0.6,
                  cursor: 'pointer',
                }}
              >
                <SlideTemplate slide={s} {...templateProps} scale={0.044} />
                {/* Loading indicator on thumbnail */}
                {generatingImages && !s.imageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <Loader2 className="h-3 w-3 animate-spin" style={{ color: '#fff' }} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: s.imageUrl ? 'transparent' : 'rgba(0,0,0,0.3)' }}>
                  <span className="text-[10px] font-bold text-white">{i + 1}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Slide editor + image controls */}
      <Card className="panel-card">
        <CardContent style={{ padding: '16px 20px' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
              Slide {slide.numero} — {slide.ruolo}
            </span>
            <div className="flex gap-1.5">
              {isEditing ? (
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingSlide(null)}>
                  <Check className="h-3.5 w-3.5" style={{ color: 'var(--viola)' }} />
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setEditingSlide(activeSlide)}>
                    <Pencil className="h-3 w-3 mr-1" /> Testo
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
                    disabled={regeneratingSlide === activeSlide}
                    onClick={() => regenerateSlide(activeSlide)}
                  >
                    {regeneratingSlide === activeSlide ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    Rigenera testo
                  </Button>
                  {hasImageRole && (
                    <Button
                      size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
                      disabled={isRegeneratingThisImage}
                      onClick={() => regenerateSingleImage(activeSlide)}
                    >
                      {isRegeneratingThisImage ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ImageIcon className="h-3 w-3 mr-1" />}
                      Rigenera immagine
                    </Button>
                  )}
                  {hasImageRole && slide.imageUrl && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          size="sm" variant="ghost" className="h-7 px-2 text-[10px]"
                          disabled={swappingImage === activeSlide}
                          style={{ color: 'var(--rosa)' }}
                        >
                          {swappingImage === activeSlide ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Shuffle className="h-3 w-3 mr-1" />}
                          Cambia immagine
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-3" align="end">
                        <div className="text-[11px] font-bold uppercase mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                          Scegli un'alternativa
                        </div>
                        {slide.imageAlternatives && slide.imageAlternatives.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            {slide.imageAlternatives.slice(0, 3).map((altUrl, ai) => (
                              <button
                                key={ai}
                                onClick={() => swapSlideImage(activeSlide, { imageUrl: altUrl })}
                                disabled={swappingImage !== null}
                                className="aspect-square rounded-md overflow-hidden border-2 hover:opacity-80 disabled:opacity-50 transition-all"
                                style={{ borderColor: 'var(--line)', cursor: swappingImage !== null ? 'wait' : 'pointer' }}
                              >
                                <img src={altUrl} alt={`Alternativa ${ai + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] mb-3 py-3 text-center rounded-md" style={{ color: 'var(--ink3)', backgroundColor: 'var(--bg)' }}>
                            Nessuna alternativa disponibile.<br />Rigenera l'immagine per ottenere nuove opzioni.
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const reader = new FileReader();
                            reader.onloadend = () => swapSlideImage(activeSlide, { dataUrl: reader.result as string });
                            reader.readAsDataURL(f);
                          }}
                          className="hidden"
                          id={`carousel-swap-upload-${activeSlide}`}
                        />
                        <label
                          htmlFor={`carousel-swap-upload-${activeSlide}`}
                          className="flex items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase rounded-lg cursor-pointer"
                          style={{ backgroundColor: 'var(--viola)', color: '#fff', letterSpacing: '0.5px' }}
                        >
                          <Upload className="w-3 h-3" /> Carica una tua foto
                        </label>
                      </PopoverContent>
                    </Popover>
                  )}
                </>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={slide.titolo}
                onChange={e => updateSlideText(activeSlide, 'titolo', e.target.value)}
                className="text-sm font-bold"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }}
              />
              <Textarea
                value={slide.testo}
                onChange={e => updateSlideText(activeSlide, 'testo', e.target.value)}
                rows={3}
                className="text-sm"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9 }}
              />
            </div>
          ) : (
            <div>
              <div className="text-sm font-bold mb-1" style={{ color: 'var(--ink)' }}>{slide.titolo}</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--ink3)' }}>{slide.testo}</div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Caption + Actions */}
      <Card className="panel-card">
        <CardContent style={{ padding: '16px 20px' }}>
          <div className="mb-4">
            <div className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Caption Instagram</div>
            <div className="p-3 rounded-xl text-xs leading-relaxed" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}>
              {carousel.caption_instagram.split('\\n\\n').join('\n\n').split('\n\n').map((para, i) => (
                <p key={i} style={{ marginBottom: i < carousel.caption_instagram.split('\n\n').length - 1 ? 12 : 0 }}>
                  {para.split('\\n').join('\n').split('\n').map((line, j) => (
                    <React.Fragment key={j}>
                      {j > 0 && <br />}
                      {line}
                    </React.Fragment>
                  ))}
                </p>
              ))}
            </div>
          </div>

          {carousel.hashtag_suggeriti.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1 mb-2">
                <Hash className="h-3 w-3" style={{ color: 'var(--ink3)' }} />
                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>Hashtag</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {carousel.hashtag_suggeriti.map((h, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--viola-dim)', color: 'var(--viola)' }}>
                    #{h.replace('#', '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={copyCaption}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-black uppercase rounded-xl"
              style={{ backgroundColor: 'var(--rosa)', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              <Copy className="h-4 w-4" /> Copia Caption
            </button>
            <button
              onClick={exportAllSlides}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-black uppercase rounded-xl"
              style={{ backgroundColor: 'var(--viola)', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              <Download className="h-4 w-4" /> Esporta Slide
            </button>
          </div>
          <button
            onClick={() => setScheduleOpen(true)}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 text-[12px] font-black uppercase rounded-xl"
            style={{
              background: 'linear-gradient(135deg, var(--viola) 0%, var(--rosa) 100%)',
              color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(230,0,126,0.25)',
            }}
          >
            <CalendarClock className="h-4 w-4" /> Programma su Instagram
          </button>
        </CardContent>
      </Card>

      <SchedulePostDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        content={carousel.caption_instagram}
        hashtags={carousel.hashtag_suggeriti.map(h => '#' + h.replace('#', '')).join(' ')}
        prepareImages={prepareImagesForSchedule}
      />

      {/* Hidden full-size slides for export */}
      <div className="fixed" style={{ left: -9999, top: -9999 }}>
        {carousel.slides.map((s, i) => (
          <div key={i}>
            <SlideTemplate slide={s} {...templateProps} scale={1} id={`slide-export-${i}`} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CarouselPreview;
