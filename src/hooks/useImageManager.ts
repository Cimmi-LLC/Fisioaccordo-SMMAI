
import { useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface UseImageManagerProps {
  carouselSlides: CarouselSlide[];
  setCarouselSlides: (slides: CarouselSlide[]) => void;
  selectedImageForEdit: string | null;
  setSelectedImageForEdit: (url: string | null) => void;
  editingSlideIndex: number | null;
  setEditingSlideIndex: (index: number | null) => void;
}

export const useImageManager = ({
  carouselSlides,
  setCarouselSlides,
  selectedImageForEdit,
  setSelectedImageForEdit,
  editingSlideIndex,
  setEditingSlideIndex
}: UseImageManagerProps) => {
  const { toast } = useToast();

  const handleImageEdit = useCallback((imageUrl: string, slideIndex: number) => {
    setSelectedImageForEdit(imageUrl);
    setEditingSlideIndex(slideIndex);
  }, [setSelectedImageForEdit, setEditingSlideIndex]);

  const handleImageUpdate = useCallback((newUrl: string) => {
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
  }, [editingSlideIndex, carouselSlides, setCarouselSlides, setSelectedImageForEdit, setEditingSlideIndex, toast]);

  return {
    handleImageEdit,
    handleImageUpdate
  };
};
