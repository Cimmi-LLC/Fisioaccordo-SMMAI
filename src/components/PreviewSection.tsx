
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Download, Sparkles, Upload, X } from "lucide-react";
import CarouselImageManager from "@/components/CarouselImageManager";
import TemplateLayoutEngine from "@/components/template/TemplateLayoutEngine";
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

  const renderSlideWithTemplate = (slide: CarouselSlide, index: number) => {
    let slideData;
    
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

    // If we have a Canva template, render with PNG background
    if (canvaTemplate) {
      return (
        <div
          key={index}
          className="relative aspect-square rounded-lg overflow-hidden group border border-border"
        >
          {/* Canva template background */}
          <img
            src={canvaTemplate.background_url}
            alt={canvaTemplate.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Text overlay using text_zones */}
          {(() => {
            const zones = canvaTemplate.text_zones?.zones || [
              { id: 'top', y: 5, height: 20, align: 'center', fontSize: 'lg' },
              { id: 'center', y: 35, height: 40, align: 'center', fontSize: 'sm' },
              { id: 'bottom', y: 80, height: 15, align: 'center', fontSize: 'xs' },
            ];
            const contentMap: Record<string, string> = {
              top: slideData.title || '',
              center: slideData.body || '',
              bottom: slideData.footer || '',
            };
            const fontSizeMap: Record<string, string> = { lg: 'text-sm font-bold', md: 'text-xs font-semibold', sm: 'text-xs', xs: 'text-[10px] opacity-80' };
            return zones.map((zone: any) => (
              contentMap[zone.id] ? (
                <div
                  key={zone.id}
                  className={`absolute left-0 right-0 flex items-center justify-center px-3 drop-shadow-lg ${fontSizeMap[zone.fontSize] || 'text-xs'}`}
                  style={{ top: `${zone.y}%`, height: `${zone.height}%`, color: canvaTemplate.text_color, textAlign: zone.align || 'center' }}
                >
                  <span className="leading-tight">{contentMap[zone.id]}</span>
                </div>
              ) : null
            ));
          })()}

          {/* Hover controls */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
            <Button onClick={() => onImageEdit(slide.userImageUrl || slide.imageUrl || '', index)} size="sm" className="p-1 h-6 w-6 bg-primary hover:bg-primary/90">✏️</Button>
            <Button onClick={() => downloadImage(slide.userImageUrl || slide.imageUrl || '', index)} size="sm" className="p-1 h-6 w-6 bg-accent hover:bg-accent/90"><Download className="w-3 h-3" /></Button>
            <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImageToSlide(index, file); }} className="hidden" id={`upload-${index}`} />
            <Button asChild size="sm" className="p-1 h-6 w-6 bg-secondary hover:bg-secondary/90 cursor-pointer"><label htmlFor={`upload-${index}`}><Upload className="w-3 h-3" /></label></Button>
          </div>
          
          {/* Slide number */}
          <div className="absolute top-2 left-2 bg-background/70 text-foreground text-xs px-2 py-1 rounded-full font-bold z-10">{index + 1}</div>
        </div>
      );
    }

    // Fallback: use old TemplateLayoutEngine
    const templateData = {
      title: slideData.title,
      mainNumber: index === 0 ? '🚨' : index === 1 ? '❌' : index === 2 ? '✅' : index === 3 ? '🔥' : '🎯',
      subtitle: slideData.subtitle,
      body: slideData.body,
      cta: index >= carouselSlides.length - 1 ? slideData.body : '',
      footer: slideData.footer || 'Studio Fisioterapico',
      imageUrl: slide.userImageUrl || slide.imageUrl,
      backgroundColor: index === 0 ? '#dc2626' : index === 1 ? '#ef4444' : index === 2 ? '#16a34a' : index === 3 ? '#7c3aed' : '#ea580c'
    };

    return (
      <div key={index} className="relative aspect-square rounded-lg overflow-hidden group border border-border bg-card">
        <TemplateLayoutEngine template="fisioaccordo" data={templateData} width={400} height={400} className="w-full h-full" />
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
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {carouselSlides.slice(0, 4).map((slide, index) => renderSlideWithTemplate(slide, index))}
                </div>
                
                {carouselSlides.length > 4 && (
                  <p className="text-muted-foreground text-sm text-center">
                    +{carouselSlides.length - 4} altre slide
                  </p>
                )}
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
