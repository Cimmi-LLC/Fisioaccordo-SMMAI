
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Copy, Image, Trash2, Plus, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface CarouselImageManagerProps {
  slides: CarouselSlide[];
  onSlidesUpdate: (slides: CarouselSlide[]) => void;
  onImageEdit: (imageUrl: string, slideIndex: number) => void;
  maxSlides?: number;
}

const CarouselImageManager: React.FC<CarouselImageManagerProps> = ({ 
  slides, 
  onSlidesUpdate, 
  onImageEdit,
  maxSlides = 7 
}) => {
  const { toast } = useToast();
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const [selectedImageForDuplication, setSelectedImageForDuplication] = useState<string | null>(null);
  const [duplicationTarget, setDuplicationTarget] = useState<'all' | 'specific'>('specific');
  const [specificSlides, setSpecificSlides] = useState<number[]>([]);

  const handleImageUpload = (slideIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedSlides = [...slides];
        if (updatedSlides[slideIndex]) {
          updatedSlides[slideIndex].userImageUrl = reader.result as string;
          onSlidesUpdate(updatedSlides);
          
          toast({
            title: "Immagine caricata! 📸",
            description: `Immagine caricata per la slide ${slideIndex + 1}`
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const duplicateImage = () => {
    if (!selectedImageForDuplication) return;

    const updatedSlides = [...slides];
    
    if (duplicationTarget === 'all') {
      // Applica a tutte le slide
      updatedSlides.forEach(slide => {
        slide.userImageUrl = selectedImageForDuplication;
      });
      toast({
        title: "Immagine duplicata! 🎨",
        description: "Immagine applicata a tutte le slide"
      });
    } else {
      // Applica solo alle slide specifiche
      specificSlides.forEach(slideIndex => {
        if (updatedSlides[slideIndex]) {
          updatedSlides[slideIndex].userImageUrl = selectedImageForDuplication;
        }
      });
      toast({
        title: "Immagine duplicata! 🎨",
        description: `Immagine applicata a ${specificSlides.length} slide selezionate`
      });
    }
    
    onSlidesUpdate(updatedSlides);
    setSelectedImageForDuplication(null);
    setSpecificSlides([]);
  };

  const removeImageFromSlide = (slideIndex: number) => {
    const updatedSlides = [...slides];
    if (updatedSlides[slideIndex]) {
      delete updatedSlides[slideIndex].userImageUrl;
      onSlidesUpdate(updatedSlides);
      
      toast({
        title: "Immagine rimossa",
        description: `Immagine rimossa dalla slide ${slideIndex + 1}`
      });
    }
  };

  const addSlide = () => {
    if (slides.length >= maxSlides) {
      toast({
        title: "Limite raggiunto",
        description: `Massimo ${maxSlides} slide consentite`,
        variant: "destructive"
      });
      return;
    }

    const newSlide: CarouselSlide = {
      type: 'text',
      content: `Slide ${slides.length + 1}: Inserisci qui il contenuto`
    };
    
    onSlidesUpdate([...slides, newSlide]);
    toast({
      title: "Slide aggiunta! ➕",
      description: `Nuova slide creata (${slides.length + 1}/${maxSlides})`
    });
  };

  const removeSlide = (slideIndex: number) => {
    if (slides.length <= 1) {
      toast({
        title: "Impossibile rimuovere",
        description: "Deve rimanere almeno una slide",
        variant: "destructive"
      });
      return;
    }

    const updatedSlides = slides.filter((_, index) => index !== slideIndex);
    onSlidesUpdate(updatedSlides);
    
    toast({
      title: "Slide rimossa",
      description: `Slide ${slideIndex + 1} eliminata`
    });
  };

  const toggleSlideSelection = (slideIndex: number) => {
    setSpecificSlides(prev => 
      prev.includes(slideIndex)
        ? prev.filter(i => i !== slideIndex)
        : [...prev, slideIndex]
    );
  };

  const currentImage = (slide: CarouselSlide) => slide.userImageUrl || slide.imageUrl;

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Gestione Immagini Carosello
          </div>
          <Badge variant="outline" className="text-gray-300">
            {slides.length}/{maxSlides} slide
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controlli per aggiungere/rimuovere slide */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={addSlide}
            disabled={slides.length >= maxSlides}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Aggiungi Slide
          </Button>
        </div>

        {/* Griglia delle slide */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {slides.map((slide, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600 hover:border-blue-500 transition-colors">
                {currentImage(slide) ? (
                  <img 
                    src={currentImage(slide)} 
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => currentImage(slide) && onImageEdit(currentImage(slide)!, index)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <Image className="w-8 h-8 mb-2" />
                    <span className="text-xs text-center">Slide {index + 1}</span>
                  </div>
                )}
              </div>

              {/* Controlli overlay */}
              <div className="absolute top-2 left-2 right-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge className="bg-black/50 text-white text-xs">
                  {index + 1}
                </Badge>
                {slides.length > 1 && (
                  <Button
                    onClick={() => removeSlide(index)}
                    size="sm"
                    variant="destructive"
                    className="p-1 h-6 w-6"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Controlli bottom */}
              <div className="absolute bottom-2 left-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <input
                  type="file"
                  ref={el => fileInputRefs.current[index] = el}
                  onChange={(e) => handleImageUpload(index, e)}
                  className="hidden"
                  accept="image/*"
                />
                <Button
                  onClick={() => fileInputRefs.current[index]?.click()}
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 p-1 h-6 text-xs"
                >
                  <Upload className="w-3 h-3" />
                </Button>
                
                {currentImage(slide) && (
                  <>
                    <Button
                      onClick={() => setSelectedImageForDuplication(currentImage(slide)!)}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 p-1 h-6"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => removeImageFromSlide(index)}
                      size="sm"
                      variant="destructive"
                      className="p-1 h-6"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>

              {/* Checkbox per selezione specifica */}
              {selectedImageForDuplication && duplicationTarget === 'specific' && (
                <div className="absolute top-2 right-2">
                  <input
                    type="checkbox"
                    checked={specificSlides.includes(index)}
                    onChange={() => toggleSlideSelection(index)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pannello duplicazione */}
        {selectedImageForDuplication && (
          <Card className="bg-gray-700/50 border-gray-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Duplica Immagine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Select value={duplicationTarget} onValueChange={setDuplicationTarget as any}>
                  <SelectTrigger className="bg-gray-600 border-gray-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="all">Applica a tutte le slide</SelectItem>
                    <SelectItem value="specific">Applica a slide specifiche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {duplicationTarget === 'specific' && (
                <div className="text-sm text-gray-300">
                  Seleziona le slide usando le checkbox sopra ({specificSlides.length} selezionate)
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={duplicateImage}
                  disabled={duplicationTarget === 'specific' && specificSlides.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Duplica
                </Button>
                <Button
                  onClick={() => {
                    setSelectedImageForDuplication(null);
                    setSpecificSlides([]);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Annulla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

export default CarouselImageManager;
