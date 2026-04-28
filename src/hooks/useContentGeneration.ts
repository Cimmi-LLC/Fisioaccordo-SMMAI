
import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useGlobalLoading } from "@/contexts/GlobalLoadingContext";
import { useContentCache } from "@/contexts/ContentCacheContext";
import { useActiveBrand } from "@/hooks/useActiveBrand";
import { contentService } from "@/services/contentService";
import { supabase } from "@/integrations/supabase/client";

interface FormData {
  description: string;
  audience: string;
  length: string;
  tone: string;
  platform: string;
  postType: string;
  numSlides: string;
  numImages: string;
  numVariations?: string;
}

export const useContentGeneration = (user: any, formData: FormData, generateCarouselSlides: () => void) => {
  const { toast } = useToast();
  const loadingState = useGlobalLoading();
  const { cacheContent, getCachedContent } = useContentCache();
  const { activeBrandId } = useActiveBrand();
  const [generatedContent, setGeneratedContent] = useState('');
  const [lastRawResponse, setLastRawResponse] = useState<any>(null);
  const [lastRawResponses, setLastRawResponses] = useState<any[]>([]);

  const generateContent = useCallback(async () => {
    if (!formData.description.trim()) {
      toast({
        title: "⚠️ Campo obbligatorio",
        description: "Inserisci una descrizione per generare il contenuto",
        variant: "destructive"
      });
      return;
    }

    const numVariations = Math.max(1, Math.min(4, parseInt(formData.numVariations || '1', 10) || 1));
    const cacheKey = `${formData.description}-${formData.postType}-${formData.numSlides}-v${numVariations}`;

    try {
      loadingState.startLoading(numVariations > 1
        ? `🚀 Genero ${numVariations} post diversi sullo stesso topic...`
        : '🚀 Generazione contenuto AI in corso...'
      );

      // Step 1: if multi-variation, expand the macro-topic into N distinct ideas.
      // Otherwise use the user input as-is.
      let topicsForGeneration: string[] = [formData.description];
      if (numVariations > 1) {
        loadingState.updateProgress(15, '💡 Trovo angoli diversi sul topic...');
        const { data: expand, error: expandErr } = await supabase.functions.invoke('expand-topic', {
          body: { topic: formData.description, count: numVariations }
        });
        if (expandErr || expand?.error || !expand?.ideas?.length) {
          throw new Error(expand?.error || expandErr?.message || 'Errore espansione topic');
        }
        topicsForGeneration = expand.ideas.map((i: any) => {
          const parts = [i.titolo];
          if (i.hook) parts.push(`Hook: ${i.hook}`);
          if (i.focus) parts.push(`Focus: ${i.focus}`);
          return parts.join('. ');
        });
      }

      loadingState.updateProgress(40, '🧠 AI sta scrivendo i post...');

      const promises = topicsForGeneration.map((specificTopic) =>
        supabase.functions.invoke('generate-content', {
          body: {
            topic: specificTopic,
            postType: formData.postType,
            numSlides: formData.numSlides,
            brandId: activeBrandId,
          }
        })
      );

      const settled = await Promise.allSettled(promises);
      const successful: any[] = [];
      const errors: string[] = [];
      settled.forEach((res, i) => {
        if (res.status === 'fulfilled') {
          const { data, error } = res.value;
          if (data?.error) errors.push(`Variante ${i + 1}: ${data.error}`);
          else if (error && !data) errors.push(`Variante ${i + 1}: ${error.message || 'errore'}`);
          else successful.push(data);
        } else {
          errors.push(`Variante ${i + 1}: ${res.reason}`);
        }
      });

      if (successful.length === 0) {
        throw new Error(errors.join(' | ') || 'Nessuna variante generata');
      }

      const first = successful[0];
      const personalizedContent = first?.content || first?.caption_instagram || '';

      loadingState.updateProgress(80, 'Ottimizzazione per viralità...');

      setGeneratedContent(personalizedContent);
      setLastRawResponse(first);
      setLastRawResponses(successful);
      generateCarouselSlides();

      cacheContent(cacheKey, personalizedContent, [], formData);

      loadingState.finishLoading(true, successful.length > 1
        ? `🎉 ${successful.length} varianti generate!`
        : '🎉 Copy personalizzato generato!'
      );

      toast({
        title: successful.length > 1 ? `🔥 ${successful.length} varianti generate!` : "🔥 Copy AI generato!",
        description: successful.length < numVariations
          ? `${successful.length}/${numVariations} riuscite. ${errors.length} fallite.`
          : "Contenuto 100% personalizzato basato sul tuo topic"
      });

    } catch (error: any) {
      console.error('Errore durante la generazione:', error);
      loadingState.finishLoading(false, '❌ Errore durante la generazione');

      const message = error?.message || 'Errore durante la generazione del contenuto. Riprova.';
      toast({
        title: "❌ Errore",
        description: message,
        variant: "destructive"
      });
    }
  }, [formData, toast, loadingState, getCachedContent, cacheContent, generateCarouselSlides]);

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
    lastRawResponse,
    lastRawResponses,
    generateContent,
    saveContent
  };
};
