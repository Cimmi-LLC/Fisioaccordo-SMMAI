
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Download, Sparkles, Upload, X } from "lucide-react";
import CarouselImageManager from "@/components/CarouselImageManager";
import { useToast } from "@/hooks/use-toast";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface PreviewSectionProps {
  generatedContent: string;
  carouselSlides: CarouselSlide[];
  setCarouselSlides: (slides: CarouselSlide[]) => void;
  appliedHook: string;
  onRemoveHook: () => void;
  onImageEdit: (imageUrl: string, slideIndex: number) => void;
  onSaveContent: () => void;
}

const PreviewSection: React.FC<PreviewSectionProps> = ({
  generatedContent,
  carouselSlides,
  setCarouselSlides,
  appliedHook,
  onRemoveHook,
  onImageEdit,
  onSaveContent
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

  const renderSlideWithText = (slide: CarouselSlide, index: number) => {
    // Estrai le parti principali del testo per il layout
    const lines = slide.content.split('\n').filter(line => line.trim());
    const mainTitle = lines[0] || '';
    const subtitle = lines[1] || '';
    const bodyText = lines.slice(2).join('\n') || '';
    
    // Diversi layout basati sul tipo di slide
    const getSlideLayout = () => {
      if (index === 0) {
        // Prima slide - Layout accattivante per fermare lo scroll
        return (
          <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold mb-2 animate-pulse">
              🚨 ATTENZIONE
            </div>
            <h1 className="text-white text-lg font-black mb-2 leading-tight drop-shadow-lg">
              {mainTitle.replace('🚨', '').trim()}
            </h1>
            <p className="text-yellow-300 text-sm font-semibold mb-3 drop-shadow-md">
              {subtitle}
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-white text-xs font-medium">
                👉 Swipe per la soluzione →
              </p>
            </div>
          </div>
        );
      } else if (index === 1) {
        // Seconda slide - Problema/Errore
        return (
          <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <div className="bg-red-500/90 backdrop-blur-sm rounded-lg p-3 border-l-4 border-white">
              <div className="flex items-center mb-2">
                <span className="text-white text-lg">❌</span>
                <h2 className="text-white text-sm font-bold ml-2">ERRORE COMUNE</h2>
              </div>
              <p className="text-white text-xs leading-relaxed">
                {bodyText.substring(0, 120)}...
              </p>
            </div>
          </div>
        );
      } else if (index === 2) {
        // Terza slide - Soluzione
        return (
          <div className="absolute inset-0 flex flex-col justify-center p-4 bg-gradient-to-br from-green-600/80 via-black/60 to-black/80">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-xl">
              <div className="flex items-center mb-2">
                <span className="text-green-600 text-lg">✅</span>
                <h2 className="text-green-800 text-sm font-bold ml-2">LA SOLUZIONE</h2>
              </div>
              <p className="text-gray-800 text-xs leading-relaxed font-medium">
                3 passi per risolvere il problema
              </p>
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-700">1️⃣ Identifica la causa</div>
                <div className="text-xs text-gray-700">2️⃣ Applica il protocollo</div>
                <div className="text-xs text-gray-700">3️⃣ Mantieni i risultati</div>
              </div>
            </div>
          </div>
        );
      } else if (index === 3) {
        // Quarta slide - Risultati
        return (
          <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-purple-900/90 via-purple-600/60 to-transparent">
            <div className="bg-yellow-400 text-purple-900 px-2 py-1 rounded-full text-xs font-bold self-start">
              🔥 RISULTATI GARANTITI
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3">
              <h3 className="text-purple-900 text-sm font-bold mb-2">Cosa ottieni:</h3>
              <div className="space-y-1">
                <div className="text-xs text-purple-800">• Miglioramento in 7 giorni</div>
                <div className="text-xs text-purple-800">• Dolore ridotto del 80%</div>
                <div className="text-xs text-purple-800">• Movimento naturale</div>
              </div>
            </div>
          </div>
        );
      } else {
        // Ultima slide - Call to Action
        return (
          <div className="absolute inset-0 flex flex-col justify-center items-center p-4 bg-gradient-to-br from-orange-600/90 via-red-600/80 to-purple-900/90">
            <div className="bg-white rounded-lg p-4 text-center shadow-2xl max-w-full">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="text-gray-900 text-sm font-bold mb-2">VUOI RISULTATI?</h3>
              <div className="space-y-1 mb-3">
                <div className="text-xs text-gray-700">📞 Consulenza GRATUITA</div>
                <div className="text-xs text-gray-700">💬 Scrivici in DM</div>
              </div>
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                PRENOTA ORA
              </div>
            </div>
          </div>
        );
      }
    };

    return (
      <div 
        key={index}
        className="relative aspect-square rounded-lg overflow-hidden group border border-gray-600 bg-gray-800"
      >
        {/* Immagine di sfondo */}
        {slide.userImageUrl || slide.imageUrl ? (
          <img 
            src={slide.userImageUrl || slide.imageUrl} 
            alt={`Slide ${index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop&crop=center`;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            Slide {index + 1}
          </div>
        )}
        
        {/* Overlay con testo stilizzato */}
        {getSlideLayout()}
        
        {/* Controlli hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <Button
            onClick={() => onImageEdit(slide.userImageUrl || slide.imageUrl || '', index)}
            size="sm"
            className="p-1 h-6 w-6 bg-blue-600 hover:bg-blue-700"
          >
            ✏️
          </Button>
          <Button
            onClick={() => downloadImage(slide.userImageUrl || slide.imageUrl || '', index)}
            size="sm"
            className="p-1 h-6 w-6 bg-green-600 hover:bg-green-700"
          >
            <Download className="w-3 h-3" />
          </Button>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                uploadImageToSlide(index, file);
              }
            }}
            className="hidden"
            id={`upload-${index}`}
          />
          <Button
            asChild
            size="sm"
            className="p-1 h-6 w-6 bg-purple-600 hover:bg-purple-700 cursor-pointer"
          >
            <label htmlFor={`upload-${index}`}>
              <Upload className="w-3 h-3" />
            </label>
          </Button>
        </div>
        
        {/* Numero slide */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-bold">
          {index + 1}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Anteprima</CardTitle>
      </CardHeader>
      <CardContent>
        {generatedContent ? (
          <div className="space-y-4">
            {/* Anteprima slide del carosello con testo sovrapposto */}
            {carouselSlides.length > 0 && (
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-3">Slide del Carosello con Testo</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {carouselSlides.slice(0, 4).map((slide, index) => renderSlideWithText(slide, index))}
                </div>
                
                {carouselSlides.length > 4 && (
                  <p className="text-gray-400 text-sm text-center">
                    +{carouselSlides.length - 4} altre slide
                  </p>
                )}
              </div>
            )}
            
            {/* Hook applicato */}
            {appliedHook && (
              <div className="bg-orange-600/20 border border-orange-500 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-orange-300 text-sm font-medium">Hook applicato:</span>
                  <Button
                    onClick={onRemoveHook}
                    size="sm"
                    variant="ghost"
                    className="text-orange-300 hover:text-orange-200 p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-orange-100 text-sm mt-1">{appliedHook}</p>
              </div>
            )}
            
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
              <pre className="text-gray-300 whitespace-pre-wrap text-sm">
                {generatedContent}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={onSaveContent}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Salva
              </Button>
              <Button 
                onClick={() => copyToClipboard(generatedContent)}
                variant="outline"
                className="flex-1 text-white border-gray-600 hover:bg-gray-700"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copia
              </Button>
            </div>

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
          <div className="text-center py-12 text-gray-400">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>I tuoi contenuti generati appariranno qui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PreviewSection;
