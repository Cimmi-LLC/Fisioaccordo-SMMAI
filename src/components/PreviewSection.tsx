
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Download, RefreshCw, Upload, X } from "lucide-react";
import CarouselImageManager from "@/components/CarouselImageManager";
import SmartCopyActions from "@/components/SmartCopyActions";
import FeedbackWidget from "@/components/FeedbackWidget";
import ImageFeedbackWidget from "@/components/ImageFeedbackWidget";
import ImageGenerationProgress from "@/components/ImageGenerationProgress";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_TEMPLATES, generateSlideLayers, type DesignTemplate, type DesignTemplateLayer } from "@/data/defaultTemplates";
import type { ImageGenProgress } from "@/hooks/useCarouselSlides";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
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
  onPublishDirect,
  isGeneratingImages,
  postType,
  onRegenerateImages,
  imageGenProgress
}) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiato!", description: "Contenuto copiato negli appunti" });
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
      toast({ title: "Download completato!", description: `Slide ${slideIndex + 1} scaricata` });
    } catch {
      toast({ title: "Errore download", description: "Impossibile scaricare l'immagine", variant: "destructive" });
    }
  };

  const uploadImageToSlide = (slideIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedSlides = [...carouselSlides];
      updatedSlides[slideIndex].userImageUrl = reader.result as string;
      setCarouselSlides(updatedSlides);
      toast({ title: "Immagine caricata!", description: `Immagine caricata per la slide ${slideIndex + 1}` });
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
      <div
        key={layer.id}
        className="absolute flex items-center justify-center overflow-hidden"
        style={{
          left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`,
          backgroundColor: layer.backgroundColor || 'transparent',
          borderRadius: layer.borderRadius ? `${layer.borderRadius * SCALE}px` : undefined,
          padding: layer.padding ? `${layer.padding * SCALE}px` : '2px',
          opacity: layer.opacity ?? 1,
        }}
      >
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
          }}>
            {text}
          </span>
        )}
      </div>
    );
  };

  const renderSlide = (slide: CarouselSlide, index: number) => {
    let slideData: Record<string, string>;
    try { slideData = JSON.parse(slide.content); }
    catch {
      const lines = slide.content.split('\n').filter(l => l.trim());
      slideData = { title: lines[0] || `Slide ${index + 1}`, subtitle: lines[1] || '', body: lines.slice(2).join('\n') || '', footer: 'Studio Fisioterapico' };
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
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
          <Button onClick={() => onImageEdit(slide.userImageUrl || slide.imageUrl || '', index)} size="sm" className="p-1 h-6 w-6 text-white border-0" style={{ backgroundColor: 'var(--rosa)' }}><Copy className="w-3 h-3" /></Button>
          <Button onClick={() => downloadImage(slide.userImageUrl || slide.imageUrl || '', index)} size="sm" className="p-1 h-6 w-6 text-white border-0" style={{ backgroundColor: 'var(--viola)' }}><Download className="w-3 h-3" /></Button>
          <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImageToSlide(index, file); }} className="hidden" id={`upload-${index}`} />
          <Button asChild size="sm" className="p-1 h-6 w-6 text-white border-0 cursor-pointer" style={{ backgroundColor: 'var(--ink2)' }}><label htmlFor={`upload-${index}`}><Upload className="w-3 h-3" /></label></Button>
        </div>
        <div className="absolute top-2 left-2 text-white text-xs px-2 py-1 rounded-full font-bold z-10" style={{ backgroundColor: 'rgba(24,21,46,0.7)' }}>{index + 1}</div>
      </div>
    );
  };

  return (
    <Card className="panel-card">
      <CardHeader style={{ padding: '22px 24px', borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>Anteprima Contenuto</CardTitle>
          {generatedContent && (
            <div className="flex items-center gap-2">
              <button onClick={() => copyToClipboard(generatedContent)} className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition-colors" style={{ border: '1px solid var(--line)', color: 'var(--ink3)', backgroundColor: 'transparent' }}>Copia</button>
              <button onClick={onSaveContent} className="text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg text-white transition-colors" style={{ backgroundColor: 'var(--rosa)', border: '1px solid var(--rosa)' }}>Salva</button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent style={{ padding: '22px 24px' }}>
        {generatedContent ? (
          <div className="space-y-4">
            {isGeneratingImages && carouselSlides.length === 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ink)' }}>{{ 'post-singolo': 'Immagine Post', 'storia': 'Immagine Storia', 'reel': 'Immagine Reel' }[postType || ''] || 'Slide Carosello'}</h3>
                <ImageGenerationProgress totalSlides={imageGenProgress?.total || 1} currentSlide={imageGenProgress?.current || 0} isGenerating={true} />
              </div>
            )}
            {carouselSlides.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--ink)' }}>{{ 'post-singolo': 'Immagine Post', 'storia': 'Immagine Storia', 'reel': 'Immagine Reel' }[postType || ''] || 'Slide Carosello'}</h3>
                {isGeneratingImages && imageGenProgress && <ImageGenerationProgress totalSlides={imageGenProgress.total} currentSlide={imageGenProgress.current} isGenerating={true} />}
                <div className={`grid gap-3 mb-4 ${carouselSlides.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {carouselSlides.map((slide, index) => renderSlide(slide, index))}
                </div>
                {carouselSlides.some(s => !s.imageUrl) && !isGeneratingImages && onRegenerateImages && (
                  <button onClick={onRegenerateImages} className="w-full text-[11px] font-black uppercase py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2" style={{ border: '1px solid var(--line)', color: 'var(--ink3)', backgroundColor: 'transparent' }}>
                    <RefreshCw className="h-3.5 w-3.5" /> Rigenera Immagini
                  </button>
                )}
              </div>
            )}
            {appliedHook && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--rosa-dim)', border: '1px solid rgba(230,0,126,0.2)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: 'var(--rosa)' }}>Hook applicato:</span>
                  <button onClick={onRemoveHook} className="p-1" style={{ color: 'var(--rosa)' }}><X className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--ink2)' }}>{appliedHook}</p>
              </div>
            )}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--line)' }}>
              <pre className="whitespace-pre-wrap text-sm" style={{ color: 'var(--ink)', fontFamily: 'Montserrat, sans-serif' }}>{generatedContent}</pre>
            </div>
            <FeedbackWidget generatedContent={generatedContent} />
            {carouselSlides.length > 0 && !isGeneratingImages && <ImageFeedbackWidget imageContext={generatedContent.substring(0, 150)} />}
            <SmartCopyActions generatedContent={generatedContent} carouselSlides={carouselSlides} onPublishDirect={onPublishDirect} isGeneratingImages={isGeneratingImages} />
            {carouselSlides.length > 0 && <CarouselImageManager slides={carouselSlides} onSlidesUpdate={setCarouselSlides} onImageEdit={onImageEdit} />}
          </div>
        ) : (
          /* ── Animated skeleton empty state ── */
          <div className="py-8">
            <div className="space-y-3 animate-pulse">
              <div className="h-5 rounded-lg w-2/3" style={{ backgroundColor: 'var(--line)' }} />
              <div className="h-4 rounded-lg w-full" style={{ backgroundColor: 'var(--line)' }} />
              <div className="h-4 rounded-lg w-5/6" style={{ backgroundColor: 'var(--line)' }} />
              <div className="h-4 rounded-lg w-4/5" style={{ backgroundColor: 'var(--line)' }} />
              <div className="h-4 rounded-lg w-3/4 mt-2" style={{ backgroundColor: 'var(--line)' }} />
              <div className="h-20 rounded-lg w-full mt-2" style={{ backgroundColor: 'var(--line)' }} />
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[1, 2, 3].map(i => <div key={i} className="aspect-square rounded-lg" style={{ backgroundColor: 'var(--line)' }} />)}
              </div>
            </div>
            <p className="text-center text-[11px] mt-5" style={{ color: 'var(--ink3)' }}>
              Il tuo contenuto apparirà qui
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreviewSection;
