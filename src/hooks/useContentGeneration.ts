
import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { useContentCache } from "@/contexts/ContentCacheContext";
import { contentService } from "@/services/contentService";
import { IntelligentCopyService } from "@/services/intelligentCopyService";

interface FormData {
  description: string;
  audience: string;
  length: string;
  tone: string;
  platform: string;
  postType: string;
  numSlides: string;
  numImages: string;
}

export const useContentGeneration = (user: any, formData: FormData, generateCarouselSlides: () => void) => {
  const { toast } = useToast();
  const loadingState = useGlobalLoading();
  const { cacheContent, getCachedContent } = useContentCache();
  const [generatedContent, setGeneratedContent] = useState('');

  const generateContent = useCallback(async () => {
    if (!formData.description.trim()) {
      toast({
        title: "⚠️ Campo obbligatorio",
        description: "Inserisci una descrizione per generare il contenuto",
        variant: "destructive"
      });
      return;
    }

    // Controlla cache
    const cacheKey = `${formData.description}-${formData.platform}-${formData.tone}`;
    const cached = getCachedContent(cacheKey);
    
    if (cached) {
      setGeneratedContent(cached.content);
      toast({
        title: "⚡ Contenuto dalla cache!",
        description: "Contenuto caricato istantaneamente dalla cache"
      });
      return;
    }

    try {
      loadingState.startLoading('🚀 Generazione contenuto AI in corso...');
      
      // Simulazione di progress realistico
      loadingState.updateProgress(20, '🧠 Analisi semantica del topic...');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      loadingState.updateProgress(50, '✍️ Generazione copy personalizzato...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      loadingState.updateProgress(80, '🎨 Ottimizzazione per viralità...');
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Usa il nuovo servizio intelligente invece del mock
      const personalizedContent = await IntelligentCopyService.generatePersonalizedCopy(
        formData.description,
        formData.audience,
        formData.platform,
        formData.tone,
        user
      );

      setGeneratedContent(personalizedContent);
      generateCarouselSlides();
      
      // Cache il contenuto
      cacheContent(cacheKey, personalizedContent, [], formData);
      
      loadingState.finishLoading(true, '🎉 Copy personalizzato generato!');
      
      toast({
        title: "🔥 Copy AI generato!",
        description: "Contenuto 100% personalizzato basato sul tuo topic specifico"
      });

    } catch (error) {
      console.error('Errore durante la generazione:', error);
      loadingState.finishLoading(false, '❌ Errore durante la generazione');
      
      toast({
        title: "❌ Errore",
        description: "Errore durante la generazione del contenuto. Riprova.",
        variant: "destructive"
      });
    }
  }, [formData, toast, loadingState, getCachedContent, cacheContent, generateCarouselSlides, user]);

  const saveContent = async (carouselSlides: any[]) => {
    if (!generatedContent) return;

    try {
      loadingState.startLoading('💾 Salvataggio contenuto...');
      
      const { error } = await contentService.saveContent({
        title: formData.description,
        contentText: generatedContent,
        topic: formData.description,
        audience: formData.audience,
        platform: formData.platform,
        postType: formData.postType,
        tone: formData.tone,
        length: formData.length,
        images: carouselSlides.map(slide => slide.userImageUrl || slide.imageUrl || '')
      });

      if (error) {
        throw error;
      }

      loadingState.finishLoading(true, '✅ Contenuto salvato!');
      
      toast({
        title: "✅ Contenuto salvato!",
        description: "Il post è stato aggiunto ai tuoi contenuti salvati"
      });
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
      loadingState.finishLoading(false, '❌ Errore salvataggio');
      
      toast({
        title: "❌ Errore",
        description: "Errore durante il salvataggio. Riprova.",
        variant: "destructive"
      });
    }
  };

  return {
    generatedContent,
    setGeneratedContent,
    generateContent,
    saveContent
  };
};
