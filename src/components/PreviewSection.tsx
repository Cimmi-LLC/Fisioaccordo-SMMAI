
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

  return (
    <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Anteprima</CardTitle>
      </CardHeader>
      <CardContent>
        {generatedContent ? (
          <div className="space-y-4">
            {/* Anteprima slide del carosello */}
            {carouselSlides.length > 0 && (
              <div className="mb-4">
                <h3 className="text-white font-semibold mb-3">Slide del Carosello</h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {carouselSlides.slice(0, 4).map((slide, index) => (
                    <div 
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden group border border-gray-600"
                    >
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
                      
                      {/* Overlay con contenuto della slide */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="text-white text-xs font-medium line-clamp-4">
                          {slide.content}
                        </div>
                        <div className="flex gap-1">
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
                      </div>
                      
                      {/* Numero slide */}
                      <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
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
