
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Download, Sparkles, Upload, X } from "lucide-react";
import CarouselImageManager from "@/components/CarouselImageManager";
// TemplateLayoutEngine replaced by inline layer rendering
import SmartCopyActions from "@/components/SmartCopyActions";
import { useToast } from "@/hooks/use-toast";

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
    toast({
      title: "Copiato! 📋",
      description: "Contenuto copiato negli appunti"
    });
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
      
      toast({
        title: "Download completato! 📥",
        description: `Slide ${slideIndex + 1} scaricata sul tuo dispositivo`
      });
    } catch (error) {
      toast({
        title: "Errore download",
        description: "Non è stato possibile scaricare l'immagine",
        variant: "destructive"
      });
    }
  };

  const uploadImageToSlide = (slideIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedSlides = [...carouselSlides];
      updatedSlides[slideIndex].userImageUrl = reader.result as string;
      setCarouselSlides(updatedSlides);
      
      toast({
        title: "Immagine caricata! 📸",
        description: `Immagine caricata per la slide ${slideIndex + 1}`
      });
    };
    reader.readAsDataURL(file);
  };

  const generateDefaultLayers = (slideData: Record<string, string>, slideIndex: number, totalSlides: number, textColor: string) => {
    const layers: any[] = [];
    
    if (slideIndex === 0) {
      // Slide apertura - enfasi sul titolo/hook
      layers.push({ id: 'title', type: 'title', x: 5, y: 12, width: 90, height: 22, fontSize: 32, fontWeight: 900, color: textColor, textAlign: 'center', fontFamily: 'Arial Black, sans-serif', textTransform: 'uppercase', shadow: { enabled: true, offsetX: 0, offsetY: 2, blur: 8, color: 'rgba(0,0,0,0.6)' } });
      layers.push({ id: 'subtitle', type: 'subtitle', x: 10, y: 38, width: 80, height: 10, fontSize: 16, fontWeight: 600, color: textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', opacity: 0.9 });
      layers.push({ id: 'body', type: 'body', x: 8, y: 52, width: 84, height: 28, fontSize: 13, fontWeight: 400, color: textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', lineHeight: 1.4 });
      layers.push({ id: 'footer', type: 'footer', x: 10, y: 86, width: 80, height: 8, fontSize: 11, fontWeight: 600, color: textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', opacity: 0.7 });
    } else if (slideIndex === totalSlides - 1) {
      // Slide CTA finale
      layers.push({ id: 'title', type: 'title', x: 8, y: 8, width: 84, height: 15, fontSize: 24, fontWeight: 800, color: textColor, textAlign: 'center', fontFamily: 'Arial Black, sans-serif', textTransform: 'uppercase', shadow: { enabled: true, offsetX: 0, offsetY: 2, blur: 6, color: 'rgba(0,0,0,0.5)' } });
      layers.push({ id: 'body', type: 'body', x: 10, y: 28, width: 80, height: 30, fontSize: 14, fontWeight: 400, color: textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', lineHeight: 1.5 });
      layers.push({ id: 'banner', type: 'cta', x: 5, y: 64, width: 90, height: 12, fontSize: 18, fontWeight: 800, color: '#ffffff', textAlign: 'center', fontFamily: 'Arial Black, sans-serif', backgroundColor: textColor, borderRadius: 8, textTransform: 'uppercase' });
      layers.push({ id: 'footer', type: 'footer', x: 10, y: 82, width: 80, height: 10, fontSize: 13, fontWeight: 700, color: textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif' });
    } else {
      // Slide contenuto - enfasi sul numero
      layers.push({ id: 'title', type: 'title', x: 5, y: 5, width: 90, height: 14, fontSize: 20, fontWeight: 700, color: textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', textTransform: 'uppercase', shadow: { enabled: true, offsetX: 0, offsetY: 1, blur: 4, color: 'rgba(0,0,0,0.4)' } });
      layers.push({ id: 'number', type: 'number', x: 25, y: 20, width: 50, height: 28, fontSize: 56, fontWeight: 900, color: textColor, textAlign: 'center', fontFamily: 'Arial Black, sans-serif', shadow: { enabled: true, offsetX: 0, offsetY: 3, blur: 10, color: 'rgba(0,0,0,0.5)' } });
      layers.push({ id: 'body', type: 'body', x: 8, y: 50, width: 84, height: 26, fontSize: 12, fontWeight: 400, color: textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', lineHeight: 1.4 });
      layers.push({ id: 'banner', type: 'banner', x: 0, y: 80, width: 100, height: 8, fontSize: 10, fontWeight: 700, color: '#ffffff', textAlign: 'center', fontFamily: 'Arial, sans-serif', backgroundColor: textColor, opacity: 0.85 });
      layers.push({ id: 'footer', type: 'footer', x: 10, y: 90, width: 80, height: 7, fontSize: 9, fontWeight: 500, color: textColor, textAlign: 'center', fontFamily: 'Arial, sans-serif', opacity: 0.6 });
    }
    
    return layers;
  };

  const renderLayerContent = (layers: any[], slideData: Record<string, string>, slide: CarouselSlide, textColor: string) => {
    return layers.map((layer: any) => {
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
      const text = contentMap[layer.type] || '';
      const isImageLayer = layer.type === 'image';

      if (!text && !isImageLayer) return null;

      const shadow = layer.shadow?.enabled
        ? `${layer.shadow.offsetX || 0}px ${layer.shadow.offsetY || 0}px ${layer.shadow.blur || 0}px ${layer.shadow.color || '#000'}`
        : undefined;

      // Scale factor: preview ~250px, original 1080px
      const scaleFactor = 0.25;

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
            borderRadius: layer.borderRadius ? `${layer.borderRadius * scaleFactor}px` : undefined,
            padding: layer.padding ? `${layer.padding * scaleFactor}px` : '2px',
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
                fontSize: `${Math.max(6, (layer.fontSize || 16) * scaleFactor)}px`,
                fontWeight: layer.fontWeight as any,
                color: layer.color || textColor,
                textAlign: (layer.textAlign || 'center') as any,
                textTransform: layer.textTransform as any,
                textShadow: shadow,
                lineHeight: layer.lineHeight ? `${layer.lineHeight}` : '1.2',
                letterSpacing: layer.letterSpacing ? `${layer.letterSpacing * scaleFactor}px` : undefined,
                width: '100%',
                display: 'block',
              }}
            >
              {text}
            </span>
          )}
        </div>
      );
    });
  };

  const renderSlideWithTemplate = (slide: CarouselSlide, index: number) => {
    let slideData: Record<string, string>;
    
    try {
      slideData = JSON.parse(slide.content);
    } catch {
      const lines = slide.content.split('\n').filter(line => line.trim());
      slideData = {
        title: lines[0] || `Slide ${index + 1}`,
        subtitle: lines[1] || '',
        body: lines.slice(2).join('\n') || '',
        footer: 'Studio Fisioterapico'
      };
    }

    if (canvaTemplate) {
      const textZones = canvaTemplate.text_zones as any;
      const hasLayers = textZones?.layers && Array.isArray(textZones.layers);
      const textColor = canvaTemplate.text_color || '#FFFFFF';

      // Use explicit layers if available, otherwise auto-generate based on slide position
      const layers = hasLayers 
        ? textZones.layers 
        : generateDefaultLayers(slideData, index, carouselSlides.length, textColor);

      return (
        <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-border">
          <img src={canvaTemplate.background_url} alt={canvaTemplate.name} className="absolute inset-0 w-full h-full object-cover" />
          
          {renderLayerContent(layers, slideData, slide, textColor)}

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
    }

    // Fallback without template: colored backgrounds with auto-generated layers
    const bgColors = ['#dc2626', '#ef4444', '#16a34a', '#7c3aed', '#ea580c', '#0891b2', '#d97706'];
    const bgColor = bgColors[index % bgColors.length];
    const layers = generateDefaultLayers(slideData, index, carouselSlides.length, '#FFFFFF');

    return (
      <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-border" style={{ backgroundColor: bgColor }}>
        {slide.userImageUrl && (
          <img src={slide.userImageUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" alt="background" />
        )}
        
        {renderLayerContent(layers, slideData, slide, '#FFFFFF')}

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
            {/* Anteprima slide del carosello con testo sovrapposto */}
            {carouselSlides.length > 0 && (
              <div className="mb-4">
                <h3 className="text-card-foreground font-semibold mb-3">Slide del Carosello con Testo</h3>
                <div className={`grid gap-3 mb-4 ${carouselSlides.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-2 md:grid-cols-3'}`}>
                  {carouselSlides.map((slide, index) => renderSlideWithTemplate(slide, index))}
                </div>
              </div>
            )}
            
            {/* Hook applicato */}
            {appliedHook && (
              <div className="bg-accent/20 border border-accent rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-accent-foreground text-sm font-medium">Hook applicato:</span>
                  <Button
                    onClick={onRemoveHook}
                    size="sm"
                    variant="ghost"
                    className="text-accent-foreground hover:text-accent-foreground/80 p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-accent-foreground text-sm mt-1">{appliedHook}</p>
              </div>
            )}
            
            <div className="bg-muted/50 p-4 rounded-lg border border-border">
              <pre className="text-foreground whitespace-pre-wrap text-sm">
                {generatedContent}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={onSaveContent}
                className="flex-1 bg-fisio hover:bg-fisio/90"
              >
                <Download className="mr-2 h-4 w-4" />
                Salva
              </Button>
              <Button 
                onClick={() => copyToClipboard(generatedContent)}
                variant="outline"
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copia
              </Button>
            </div>

            {/* Smart Copy Actions */}
            <SmartCopyActions
              generatedContent={generatedContent}
              carouselSlides={carouselSlides}
            />

            {/* Gestione Immagini Carosello */}
            {carouselSlides.length > 0 && (
              <CarouselImageManager
                slides={carouselSlides}
                onSlidesUpdate={setCarouselSlides}
                onImageEdit={onImageEdit}
              />
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
