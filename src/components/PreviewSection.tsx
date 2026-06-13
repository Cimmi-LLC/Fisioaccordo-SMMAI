
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Copy, Download, RefreshCw, Upload, X, Shuffle, Loader2, CalendarClock } from "lucide-react";
import MinimalProgressBar from "@/components/carousel/MinimalProgressBar";
import SchedulePostDialog from "@/components/schedule/SchedulePostDialog";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_TEMPLATES, generateSlideLayers, type DesignTemplate, type DesignTemplateLayer } from "@/data/defaultTemplates";
import type { ImageGenProgress } from "@/hooks/useCarouselSlides";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
  imageAlternatives?: string[];
}

interface CanvaTemplateData {
  id: string;
  background_url: string;
  text_zones: any;
  text_color: string;
  name: string;
}

interface PreviewSectionProps {
  generatedContent: string;
  carouselSlides: CarouselSlide[];
  setCarouselSlides: (slides: CarouselSlide[]) => void;
  appliedHook: string;
  onRemoveHook: () => void;
  onImageEdit: (imageUrl: string, slideIndex: number) => void;
  onSaveContent: () => void;
  canvaTemplate?: CanvaTemplateData | null;
  onPublishDirect?: (platforms: string[]) => Promise<void>;
  isGeneratingImages?: boolean;
  postType?: string;
  onRegenerateImages?: () => void;
  imageGenProgress?: ImageGenProgress;
}

const PreviewSection: React.FC<PreviewSectionProps> = ({
  generatedContent,
  carouselSlides,
  setCarouselSlides,
  appliedHook,
  onRemoveHook,
  onImageEdit,
  onSaveContent,
  canvaTemplate,
  isGeneratingImages,
  postType,
  onRegenerateImages,
  imageGenProgress
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  /**
   * Build the post payload for SchedulePostDialog.
   * Persistence rule (sprint 1.5): {bucket, paths}, never URLs.
   * Re-uploads each slide via save-slide-image so the returned path is
   * canonical and rooted on the verified user id.
   */
  const prepareImagesForSchedule = async (): Promise<{ bucket: string; paths: string[] }> => {
    const paths: string[] = [];
    let bucket = 'carousel-images';
    for (let i = 0; i < carouselSlides.length; i++) {
      const s = carouselSlides[i];
      const sourceUrl = s.userImageUrl || s.imageUrl;
      if (!sourceUrl) continue;
      const { data, error } = await supabase.functions.invoke('save-slide-image', {
        body: { imageUrl: sourceUrl, slideIndex: i },
      });
      if (error || data?.error || !data?.path) {
        throw new Error(data?.error || error?.message || `Errore upload slide ${i + 1}`);
      }
      paths.push(data.path as string);
      if (data.bucket) bucket = data.bucket as string;
    }
    if (paths.length === 0) throw new Error('Nessuna immagine disponibile');
    return { bucket, paths };
  };

  const swapSlideImage = async (
    slideIndex: number,
    source: { imageUrl?: string; dataUrl?: string }
  ) => {
    setSwappingIndex(slideIndex);
    try {
      const { data, error } = await supabase.functions.invoke('save-slide-image', {
        body: {
          imageUrl: source.imageUrl,
          dataUrl: source.dataUrl,
          userId: user?.id,
          slideIndex,
        },
      });
      if (error || data?.error || !data?.url) {
        throw new Error(data?.error || error?.message || 'Errore sconosciuto');
      }
      const newUrl = data.url as string;
      const updated = [...carouselSlides];
      const previous = updated[slideIndex].imageUrl;
      const oldAlternatives = updated[slideIndex].imageAlternatives || [];
      // Rotate alternatives: drop the one just chosen, push the previous default at the end
      const nextAlternatives = source.imageUrl
        ? [...oldAlternatives.filter(u => u !== source.imageUrl), ...(previous ? [previous] : [])]
        : oldAlternatives;
      updated[slideIndex] = {
        ...updated[slideIndex],
        imageUrl: newUrl,
        imageAlternatives: nextAlternatives,
      };
      setCarouselSlides(updated);
      toast({ title: 'Immagine cambiata' });
    } catch (e) {
      toast({
        title: 'Errore cambio immagine',
        description: e instanceof Error ? e.message : 'Riprova',
        variant: 'destructive',
      });
    } finally {
      setSwappingIndex(null);
    }
  };

  const handleSwapUpload = (slideIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      swapSlideImage(slideIndex, { dataUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiato!", description: "Testo copiato negli appunti" });
  };

  const downloadImage = async (imageUrl: string, slideIndex: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slide-${slideIndex + 1}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast({ title: "Errore download", variant: "destructive" });
    }
  };

  const downloadAllImages = async () => {
    for (let i = 0; i < carouselSlides.length; i++) {
      const url = carouselSlides[i].userImageUrl || carouselSlides[i].imageUrl;
      if (url) await downloadImage(url, i);
    }
  };

  const uploadImageToSlide = (slideIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedSlides = [...carouselSlides];
      updatedSlides[slideIndex].userImageUrl = reader.result as string;
      setCarouselSlides(updatedSlides);
    };
    reader.readAsDataURL(file);
  };

  const resolveDesignTemplate = (): DesignTemplate => {
    if (canvaTemplate) {
      const tz = canvaTemplate.text_zones as any;
      const hasNewFormat = tz?.background && tz?.layers && Array.isArray(tz.layers);
      if (hasNewFormat) {
        return { id: canvaTemplate.id, name: canvaTemplate.name, background: tz.background, photoZone: tz.photoZone, overlayColor: tz.overlayColor, layers: tz.layers };
      }
    }
    return DEFAULT_TEMPLATES[0];
  };

  const SCALE = 0.25;

  const renderLayer = (layer: DesignTemplateLayer, slideData: Record<string, string>, slide: CarouselSlide) => {
    const contentMap: Record<string, string> = {
      title: slideData.title || '', number: slideData.number || '', subtitle: slideData.subtitle || '',
      body: slideData.body || '', cta: slideData.cta || '', banner: slideData.banner || '',
      footer: slideData.footer || '', logo: slideData.logo || '', image: '',
    };
    const text = layer.defaultText || contentMap[layer.type] || '';
    const isImageLayer = layer.type === 'image';
    if (!text && !isImageLayer) return null;
    const shadow = layer.shadow?.enabled ? `${layer.shadow.offsetX || 0}px ${layer.shadow.offsetY || 0}px ${layer.shadow.blur || 0}px ${layer.shadow.color || '#000'}` : undefined;
    return (
      <div key={layer.id} className="absolute flex items-center justify-center overflow-hidden" style={{
        left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`,
        backgroundColor: layer.backgroundColor || 'transparent',
        borderRadius: layer.borderRadius ? `${layer.borderRadius * SCALE}px` : undefined,
        padding: layer.padding ? `${layer.padding * SCALE}px` : '2px',
        opacity: layer.opacity ?? 1,
      }}>
        {isImageLayer ? (
          slide.userImageUrl ? <img src={slide.userImageUrl} className="w-full h-full object-cover" alt="user" /> : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center text-muted-foreground text-xs"><Upload className="w-4 h-4" /></div>
          )
        ) : (
          <span style={{
            fontFamily: layer.fontFamily || 'Montserrat, sans-serif',
            fontSize: `${Math.max(6, (layer.fontSize || 16) * SCALE)}px`,
            fontWeight: layer.fontWeight as any, color: layer.color || '#FFFFFF',
            textAlign: (layer.textAlign || 'center') as any, textTransform: layer.textTransform as any,
            textShadow: shadow, lineHeight: layer.lineHeight ? `${layer.lineHeight}` : '1.2',
            letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * SCALE}px` : undefined,
            width: '100%', display: 'block',
          }}>{text}</span>
        )}
      </div>
    );
  };

  const renderSlide = (slide: CarouselSlide, index: number) => {
    let slideData: Record<string, string>;
    try { slideData = JSON.parse(slide.content); }
    catch {
      const lines = slide.content.split('\n').filter(l => l.trim());
      slideData = { title: lines[0] || `Slide ${index + 1}`, subtitle: lines[1] || '', body: lines.slice(2).join('\n') || '' };
    }
    const designTemplate = resolveDesignTemplate();
    const slideLayers = generateSlideLayers(index, carouselSlides.length, designTemplate);
    let bgStyle: React.CSSProperties = {};
    if (designTemplate.background.type === 'solid') bgStyle.backgroundColor = designTemplate.background.value;
    else if (designTemplate.background.type === 'gradient') bgStyle.background = designTemplate.background.value;

    return (
      <div key={index} className="relative aspect-square rounded-lg overflow-hidden group" style={{ border: '1px solid var(--line)', ...bgStyle }}>
        {slide.imageUrl && <img src={slide.imageUrl} alt={`Slide ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />}
        {designTemplate.photoZone && slide.userImageUrl && (
          <img src={slide.userImageUrl} alt="user photo" className="absolute object-cover" style={{ left: `${designTemplate.photoZone.x}%`, top: `${designTemplate.photoZone.y}%`, width: `${designTemplate.photoZone.width}%`, height: `${designTemplate.photoZone.height}%`, opacity: designTemplate.photoZone.opacity, objectFit: designTemplate.photoZone.objectFit as any }} />
        )}
        {designTemplate.overlayColor && <div className="absolute inset-0" style={{ backgroundColor: designTemplate.overlayColor }} />}
        {slideLayers.map(layer => renderLayer(layer, slideData, slide))}
        {/* Hover actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
          {slide.imageUrl && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  className="p-1 h-6 w-6 text-white border-0"
                  style={{ backgroundColor: 'var(--rosa)' }}
                  title="Cambia immagine"
                >
                  {swappingIndex === index ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shuffle className="w-3 h-3" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="end">
                <div className="text-[11px] font-bold uppercase mb-2" style={{ color: 'var(--ink3)', letterSpacing: '0.5px' }}>
                  Cambia immagine
                </div>
                {slide.imageAlternatives && slide.imageAlternatives.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {slide.imageAlternatives.slice(0, 3).map((altUrl, ai) => (
                      <button
                        key={ai}
                        onClick={() => swapSlideImage(index, { imageUrl: altUrl })}
                        disabled={swappingIndex !== null}
                        className="aspect-square rounded-md overflow-hidden border-2 hover:opacity-80 disabled:opacity-50"
                        style={{ borderColor: 'var(--line)', cursor: swappingIndex !== null ? 'wait' : 'pointer' }}
                      >
                        <img src={altUrl} alt={`Alternativa ${ai + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] mb-3 py-3 text-center rounded-md" style={{ color: 'var(--ink3)', backgroundColor: 'var(--bg)' }}>
                    Nessuna alternativa disponibile
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSwapUpload(index, f); }}
                  className="hidden"
                  id={`swap-upload-${index}`}
                />
                <label
                  htmlFor={`swap-upload-${index}`}
                  className="flex items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase rounded-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--viola)', color: '#fff', letterSpacing: '0.5px' }}
                >
                  <Upload className="w-3 h-3" /> Carica una tua foto
                </label>
              </PopoverContent>
            </Popover>
          )}
          <Button onClick={() => downloadImage(slide.userImageUrl || slide.imageUrl || '', index)} size="sm" className="p-1 h-6 w-6 text-white border-0" style={{ backgroundColor: 'var(--viola)' }}><Download className="w-3 h-3" /></Button>
          <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImageToSlide(index, file); }} className="hidden" id={`upload-${index}`} />
          <Button asChild size="sm" className="p-1 h-6 w-6 text-white border-0 cursor-pointer" style={{ backgroundColor: 'var(--ink2)' }}><label htmlFor={`upload-${index}`}><Upload className="w-3 h-3" /></label></Button>
        </div>
        <div className="absolute top-2 left-2 text-white text-xs px-2 py-1 rounded-full font-bold z-10" style={{ backgroundColor: 'rgba(24,21,46,0.7)' }}>{index + 1}</div>
      </div>
    );
  };

  if (!generatedContent) {
    return (
      <Card className="panel-card">
        <CardContent style={{ padding: '24px' }}>
          <div className="py-12 text-center">
            <div className="space-y-3 animate-pulse mb-4">
              <div className="h-5 rounded-lg w-2/3 mx-auto" style={{ backgroundColor: 'var(--line)' }} />
              <div className="h-4 rounded-lg w-full" style={{ backgroundColor: 'var(--line)' }} />
              <div className="h-4 rounded-lg w-5/6" style={{ backgroundColor: 'var(--line)' }} />
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[1, 2, 3].map(i => <div key={i} className="aspect-square rounded-lg" style={{ backgroundColor: 'var(--line)' }} />)}
              </div>
            </div>
            <p className="text-[12px]" style={{ color: 'var(--ink3)' }}>
              Scrivi un argomento e clicca "Genera Contenuto"
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="panel-card">
      <CardContent style={{ padding: '24px' }}>
        <div className="space-y-4">
          {/* Carousel slides */}
          {isGeneratingImages && carouselSlides.length === 0 && (
            <MinimalProgressBar current={imageGenProgress?.current || 0} total={imageGenProgress?.total || 1} />
          )}
          {carouselSlides.length > 0 && (
            <div>
              {isGeneratingImages && imageGenProgress && <MinimalProgressBar current={imageGenProgress.current} total={imageGenProgress.total} />}
              <div className={`grid gap-3 ${carouselSlides.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 md:grid-cols-3'}`}>
                {carouselSlides.map((slide, index) => renderSlide(slide, index))}
              </div>
            </div>
          )}

          {/* Applied hook */}
          {appliedHook && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--rosa-dim)', border: '1px solid rgba(230,0,126,0.2)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--rosa)' }}>Hook applicato:</span>
                <button onClick={onRemoveHook} className="p-1" style={{ color: 'var(--rosa)' }}><X className="w-3.5 h-3.5" /></button>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--ink2)' }}>{appliedHook}</p>
            </div>
          )}

          {/* Generated text */}
          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--ink)', fontFamily: 'Montserrat, sans-serif' }}>{generatedContent}</pre>
          </div>

          {/* Action buttons — clean and clear */}
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(generatedContent)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-black uppercase rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--rosa)', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              <Copy className="h-4 w-4" /> Copia Testo
            </button>
            <button
              onClick={onSaveContent}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-black uppercase rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--viola)', color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              <Download className="h-4 w-4" /> Salva
            </button>
          </div>

          {/* Secondary actions */}
          <div className="flex gap-2">
            {carouselSlides.length > 0 && (
              <button
                onClick={downloadAllImages}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg"
                style={{ border: '1px solid var(--line)', color: 'var(--ink3)', background: 'transparent', cursor: 'pointer' }}
              >
                <Download className="h-3 w-3" /> Scarica Immagini
              </button>
            )}
            {carouselSlides.some(s => !s.imageUrl) && !isGeneratingImages && onRegenerateImages && (
              <button
                onClick={onRegenerateImages}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg"
                style={{ border: '1px solid var(--line)', color: 'var(--ink3)', background: 'transparent', cursor: 'pointer' }}
              >
                <RefreshCw className="h-3 w-3" /> Rigenera Immagini
              </button>
            )}
          </div>

          {/* Programma su Instagram */}
          {carouselSlides.length > 0 && carouselSlides.some(s => s.imageUrl || s.userImageUrl) && (
            <button
              onClick={() => setScheduleOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-[12px] font-black uppercase rounded-xl"
              style={{
                background: 'linear-gradient(135deg, var(--viola) 0%, var(--rosa) 100%)',
                color: '#fff', border: 'none', cursor: 'pointer', letterSpacing: '0.5px',
                boxShadow: '0 4px 12px rgba(230,0,126,0.25)',
              }}
            >
              <CalendarClock className="h-4 w-4" /> Programma su Instagram
            </button>
          )}
        </div>

        <SchedulePostDialog
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          content={generatedContent}
          prepareImages={prepareImagesForSchedule}
        />
      </CardContent>
    </Card>
  );
};

export default PreviewSection;
