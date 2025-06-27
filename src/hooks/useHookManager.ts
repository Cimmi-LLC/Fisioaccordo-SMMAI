
import { useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface FormData {
  description: string;
}

interface UseHookManagerProps {
  carouselSlides: CarouselSlide[];
  setCarouselSlides: (slides: CarouselSlide[]) => void;
  generatedContent: string;
  setGeneratedContent: (content: string | ((prev: string) => string)) => void;
  appliedHook: string;
  setAppliedHook: (hook: string) => void;
  formData: FormData;
}

export const useHookManager = ({
  carouselSlides,
  setCarouselSlides,
  generatedContent,
  setGeneratedContent,
  appliedHook,
  setAppliedHook,
  formData
}: UseHookManagerProps) => {
  const { toast } = useToast();

  const applyHookToContent = useCallback((hook: string) => {
    if (carouselSlides.length > 0) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[0].content = `${hook}\n\n👉 Swipe per scoprire di più →`;
      setCarouselSlides(updatedSlides);
    }
    
    setGeneratedContent(prev => {
      const lines = prev.split('\n');
      lines[0] = hook;
      return lines.join('\n');
    });
    
    setAppliedHook(hook);
    toast({
      title: "Hook applicato! 🎯",
      description: "L'hook è stato inserito nella prima slide e nel contenuto"
    });
  }, [carouselSlides, setCarouselSlides, setGeneratedContent, setAppliedHook, toast]);

  const removeHook = useCallback(() => {
    if (carouselSlides.length > 0) {
      const updatedSlides = [...carouselSlides];
      updatedSlides[0].content = `🚨 ${formData.description.toUpperCase()}\n\nSCOPRI LA VERITÀ che i dottori non ti dicono!\n\n👉 Swipe per la soluzione →`;
      setCarouselSlides(updatedSlides);
    }
    
    setGeneratedContent(prev => {
      const lines = prev.split('\n');
      lines.shift();
      return lines.join('\n');
    });
    
    setAppliedHook('');
    toast({
      title: "Hook rimosso",
      description: "L'hook è stato rimosso dal contenuto e dalla prima slide"
    });
  }, [carouselSlides, setCarouselSlides, setGeneratedContent, setAppliedHook, formData, toast]);

  return {
    applyHookToContent,
    removeHook
  };
};
