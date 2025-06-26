
import React from 'react';
import { useToast } from "@/hooks/use-toast";

interface CarouselSlide {
  type: string;
  content: string;
  imageUrl?: string;
  userImageUrl?: string;
}

interface HookManagerProps {
  carouselSlides: CarouselSlide[];
  setCarouselSlides: (slides: CarouselSlide[]) => void;
  generatedContent: string;
  setGeneratedContent: (content: string) => void;
  appliedHook: string;
  setAppliedHook: (hook: string) => void;
  formData: {
    description: string;
  };
}

const HookManager: React.FC<HookManagerProps> = ({
  carouselSlides,
  setCarouselSlides,
  generatedContent,
  setGeneratedContent,
  appliedHook,
  setAppliedHook,
  formData
}) => {
  const { toast } = useToast();

  const applyHookToContent = (hook: string) => {
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
  };

  const removeHook = () => {
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
  };

  return {
    applyHookToContent,
    removeHook
  };
};

export default HookManager;
