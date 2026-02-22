
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Download, Sparkles, Upload, X } from "lucide-react";
import CarouselImageManager from "@/components/CarouselImageManager";
import SmartCopyActions from "@/components/SmartCopyActions";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_TEMPLATES, generateSlideLayers, type DesignTemplate, type DesignTemplateLayer } from "@/data/defaultTemplates";

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
}

const PreviewSection: React.FC<PreviewSectionProps> = ({
  generatedContent,
  carouselSlides,
  setCarouselSlides,
  appliedHook,
  onRemoveHook,
  onImageEdit,
  onSaveContent,
  canvaTemplate
}) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiato! 📋", description: "Contenuto copiato negli appunti" });
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
      toast({ title: "Download completato! 📥", description: `Slide ${slideIndex + 1} scaricata` });
    } catch {
      toast({ title: "Errore download", description: "Non è stato possibile scaricare l'immagine", variant: "destructive" });
    }
  };

  const uploadImageToSlide = (slideIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedSlides = [...carouselSlides];
      updatedSlides[slideIndex].userImageUrl = reader.result as string;
      setCarouselSlides(updatedSlides);
      toast({ title: "Immagine caricata! 📸", description: `Immagine caricata per la slide ${slideIndex + 1}` });
    };
    reader.readAsDataURL(file);
  };

  // Resolve the design template to use
  const resolveDesignTemplate = (): DesignTemplate => {
    if (canvaTemplate) {
      const tz = canvaTemplate.text_zones as any;
      const hasNewFormat = tz?.background && tz?.layers && Array.isArray(tz.layers);
      
      if (hasNewFormat) {
        return {
          id: canvaTemplate.id,
          name: canvaTemplate.name,
          background: tz.background,
          photoZone: tz.photoZone,
          overlayColor: tz.overlayColor,
          layers: tz.layers,
        };
      }
    }
    // Fallback: use first default template
    return DEFAULT_TEMPLATES[0];
  };

  const SCALE = 0.25; // preview ~270px / 1080px original

  const renderLayer = (layer: DesignTemplateLayer, slideData: Record<string, string>, slide: CarouselSlide) => {
    const contentMap: Record<string, string> = {
      title: slideData.title || '',
      number: slideData.number || '',
      subtitle: slideData.subtitle || '',
      body: slideData.body || '',
      cta: slideData.cta || '',
      banner: slideData.banner || '',
      footer: slideData.footer || '',
      logo: slideData.logo || '',
      image: '',
    };

    // Use defaultText if present, otherwise use AI-generated text
    const text = layer.defaultText || contentMap[layer.type] || '';
    const isImageLayer = layer.type === 'image';

    if (!text && !isImageLayer) return null;

    const shadow = layer.shadow?.enabled
      ? `${layer.shadow.offsetX || 0}px ${layer.shadow.offsetY || 0}px ${layer.shadow.blur || 0}px ${layer.shadow.color || '#000'}`
      : undefined;

    return (
      <div
        key={layer.id}
        className="absolute flex items-center justify-center overflow-hidden"
        style={{
          left: `${layer.x}%`,
          top: `${layer.y}%`,
          width: `${layer.width}%`,
          height: `${layer.height}%`,
          backgroundColor: layer.backgroundColor || 'transparent',
          borderRadius: layer.borderRadius ? `${layer.borderRadius * SCALE}px` : undefined,
          padding: layer.padding ? `${layer.padding * SCALE}px` : '2px',
          opacity: layer.opacity ?? 1,
        }}
      >
        {isImageLayer ? (
          slide.userImageUrl ? (
            <img src={slide.userImageUrl} className="w-full h-full object-cover" alt="user" />
          ) : (
            <div className="w-full h-full bg-muted/30 flex items-center justify-center text-muted-foreground text-xs">📷</div>
          )
        ) : (
          <span
            style={{
              fontFamily: layer.fontFamily || 'Arial, sans-serif',
              fontSize: `${Math.max(6, (layer.fontSize || 16) * SCALE)}px`,
              fontWeight: layer.fontWeight as any,
              color: layer.color || '#FFFFFF',
              textAlign: (layer.textAlign || 'center') as any,
              textTransform: layer.textTransform as any,
              textShadow: shadow,
              lineHeight: layer.lineHeight ? `${layer.lineHeight}` : '1.2',
              letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * SCALE}px` : undefined,
              width: '100%',
              display: 'block',
            }}
          >
            {text}
          </span>
        )}
      </div>
    );
  };

  const renderSlide = (slide: CarouselSlide, index: number) => {
    let slideData: Record<string, string>;
    try {
      slideData = JSON.parse(slide.content);
    } catch {
      const lines = slide.content.split('\n').filter(l => l.trim());
      slideData = {
        title: lines[0] || `Slide ${index + 1}`,
        subtitle: lines[1] || '',
        body: lines.slice(2).join('\n') || '',
        footer: 'Studio Fisioterapico',
      };
    }

    const designTemplate = resolveDesignTemplate();
    
    // Generate slide-specific layers
    const slideLayers = generateSlideLayers(index, carouselSlides.length, designTemplate);

    // Background style
    let bgStyle: React.CSSProperties = {};
    if (designTemplate.background.type === 'solid') {
      bgStyle.backgroundColor = designTemplate.background.value;
    } else if (designTemplate.background.type === 'gradient') {
      bgStyle.background = designTemplate.background.value;
    }

    return (
      <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-border" style={bgStyle}>
        {/* Photo zone */}
        {designTemplate.photoZone && slide.userImageUrl && (
          <img
            src={slide.userImageUrl}
            alt="user photo"
            className="absolute object-cover"
            style={{
              left: `${designTemplate.photoZone.x}%`,
              top: `${designTemplate.photoZone.y}%`,
              width: `${designTemplate.photoZone.width}%`,
              height: `${designTemplate.photoZone.height}%`,
              opacity: designTemplate.photoZone.opacity,
              objectFit: designTemplate.photoZone.objectFit as any,
            }}
          />
        )}

        {/* Overlay */}
        {designTemplate.overlayColor && (
          <div className="absolute inset-0" style={{ backgroundColor: designTemplate.overlayColor }} />
        )}

        {/* Layers */}
        {slideLayers.map(layer => renderLayer(layer, slideData, slide))}

        {/* Hover controls */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
          <Button onClick={() => onImageEdit(slide.userImageUrl || slide.imageUrl || '', index)} size="sm" className="p-1 h-6 w-6 bg-primary hover:bg-primary/90">✏️</Button>
          <Button onClick={() => downloadImage(slide.userImageUrl || slide.imageUrl || '', index)} size="sm" className="p-1 h-6 w-6 bg-accent hover:bg-accent/90"><Download className="w-3 h-3" /></Button>
          <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImageToSlide(index, file); }} className="hidden" id={`upload-${index}`} />
          <Button asChild size="sm" className="p-1 h-6 w-6 bg-secondary hover:bg-secondary/90 cursor-pointer"><label htmlFor={`upload-${index}`}><Upload className="w-3 h-3" /></label></Button>
        </div>
        <div className="absolute top-2 left-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded-full font-bold z-10">{index + 1}</div>
      </div>
    );
  };

  return (
    <Card className="bg-card/50 border-border backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-card-foreground">Anteprima</CardTitle>
      </CardHeader>
      <CardContent>
        {generatedContent ? (
          <div className="space-y-4">
            {carouselSlides.length > 0 && (
              <div className="mb-4">
                <h3 className="text-card-foreground font-semibold mb-3">Slide del Carosello</h3>
                <div className={`grid gap-3 mb-4 ${carouselSlides.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {carouselSlides.map((slide, index) => renderSlide(slide, index))}
                </div>
              </div>
            )}
            
            {appliedHook && (
              <div className="bg-accent/20 border border-accent rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-accent-foreground text-sm font-medium">Hook applicato:</span>
                  <Button onClick={onRemoveHook} size="sm" variant="ghost" className="text-accent-foreground hover:text-accent-foreground/80 p-1 h-auto">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-accent-foreground text-sm mt-1">{appliedHook}</p>
              </div>
            )}
            
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <pre className="text-foreground whitespace-pre-wrap text-sm">{generatedContent}</pre>
            </div>

            <div className="flex gap-2">
              <Button onClick={onSaveContent} className="flex-1 bg-fisio hover:bg-fisio/90">
                <Download className="mr-2 h-4 w-4" /> Salva
              </Button>
              <Button onClick={() => copyToClipboard(generatedContent)} variant="outline" className="flex-1">
                <Copy className="mr-2 h-4 w-4" /> Copia
              </Button>
            </div>

            <SmartCopyActions generatedContent={generatedContent} carouselSlides={carouselSlides} />

            {carouselSlides.length > 0 && (
              <CarouselImageManager slides={carouselSlides} onSlidesUpdate={setCarouselSlides} onImageEdit={onImageEdit} />
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>I tuoi contenuti generati appariranno qui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreviewSection;
