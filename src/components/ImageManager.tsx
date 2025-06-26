
import React from 'react';
import { useToast } from "@/hooks/use-toast";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface ImageManagerProps {
  carouselSlides: CarouselSlide[];
  setCarouselSlides: (slides: CarouselSlide[]) => void;
  selectedImageForEdit: string | null;
  setSelectedImageForEdit: (url: string | null) => void;
  editingSlideIndex: number | null;
  setEditingSlideIndex: (index: number | null) => void;
}

const ImageManager: React.FC<ImageManagerProps> = ({
  carouselSlides,
  setCarouselSlides,
  selectedImageForEdit,
  setSelectedImageForEdit,
  editingSlideIndex,
  setEditingSlideIndex
}) => {
  const { toast } = useToast();

  const handleImageEdit = (imageUrl: string, slideIndex: number) => {
    setSelectedImageForEdit(imageUrl);
    setEditingSlideIndex(slideIndex);
  };

  const handleImageUpdate = (newUrl: string) => {
    if (editingSlideIndex !== null) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[editingSlideIndex].userImageUrl = newUrl;
      setCarouselSlides(updatedSlides);
    }
    setSelectedImageForEdit(null);
    setEditingSlideIndex(null);
    
    toast({
      title: "🎨 Immagine aggiornata!",
      description: "L'immagine è stata modificata con successo"
    });
  };

  return {
    handleImageEdit,
    handleImageUpdate
  };
};

export default ImageManager;
